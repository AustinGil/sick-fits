const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomBytes } = require("crypto");
const { promisify } = require("util");
const { transport, makeANiceEmail } = require("../mail");
const { hasPermission } = require("../utils");

const mutations = {
  async createItem(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("You must be logged in to do that.");
    }
    const item = await ctx.db.mutation.createItem(
      {
        data: {
          // This is how we make relationships between User and Item in Prisma
          user: {
            connect: {
              id: ctx.request.userId
            }
          },
          ...args
        }
      },
      info
    );
    return item;
  },

  updateItem(parent, args, ctx, info) {
    // first take copy of updates
    const updates = { ...args };
    delete updates.id;
    return ctx.db.mutation.updateItem(
      {
        data: updates,
        where: {
          id: args.id
        }
      },
      info // contains query from client side which determines what to return
    );
  },

  async deleteItem(parent, args, ctx, info) {
    const where = { id: args.id };
    // Query the item exists
    const item = await ctx.db.query.item(
      { where },
      `{
        id
        title
        user {
          id
        }
      }`
    );
    // Check that user owns it
    const ownsItem = item.user.id === ctx.request.userId;
    const hasPermissions = ctx.request.user.permissions.some(permission => {
      return Array("ADMIN", "ITEM_DELETE").includes(permission);
    });

    if (!ownsItem && !hasPermissions) {
      throw new Error("You don't have permission to do that.");
    }
    // Delete it
    return ctx.db.mutation.deleteItem({ where }, info);
  },

  async signup(parent, args, ctx, info) {
    // lowercase email
    args.email = args.email.toLowerCase();
    // hash password
    const password = await bcrypt.hash(args.password, 10);
    // create user in db
    const user = await ctx.db.mutation.createUser(
      {
        data: {
          ...args,
          password,
          permissions: { set: ["USER"] }
        }
      },
      info
    );
    // create JWT for them
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    // set jwt as a cookie on response
    ctx.response.cookie("token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365
    });

    return user;
  },

  async signin(parent, { email, password }, ctx, info) {
    // Check if user with email
    const user = await ctx.db.query.user({ where: { email } });
    if (!user) {
      throw new Error(`No such user found for email ${email}`);
    }
    // Check password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new Error("Invalid password");
    }
    // Generate JWT and set in cookie
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    ctx.response.cookie("token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365
    });
    // Return user
    return user;
  },

  signout(parent, args, ctx, info) {
    ctx.response.clearCookie("token");
    return { message: "See ya!" };
  },

  async requestReset(parent, args, ctx, info) {
    // 1. Validate user
    const user = await ctx.db.query.user({ where: { email: args.email } });
    if (!user) {
      throw new Error(`No such user found for email ${args.email}`);
    }
    // 2. Set reset tokens
    const randomBytesPr = promisify(randomBytes);
    const resetToken = (await randomBytesPr(20)).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now
    const res = await ctx.db.mutation.updateUser({
      where: { email: args.email },
      data: { resetToken, resetTokenExpiry }
    });
    // 3. Email token
    const mailRes = await transport.sendMail({
      from: "austin@stegosource.com",
      to: user.email,
      subjectLine: "Your Password Reset Token",
      html: makeANiceEmail(`Your password reset token is here:
        \n \n
        <a href="${process.env.FRONTEND_URL}/reset?resetToken=${resetToken}">Click here to reset</a>
      `)
    });

    return { message: "Sent!" };
  },

  async resetPassword(parent, args, ctx, info) {
    // 1. Check passwords match
    if (args.password !== args.confirmPassword) {
      throw new Error("Passwords do not match");
    }
    // 2. Validate token
    const [user] = await ctx.db.query.users({
      where: {
        resetToken: args.resetToken,
        resetTokenExpiry_gte: Date.now() - 3600000
      }
    });
    if (!user) {
      throw new Error("Token invalid or expired");
    }
    // 3. Hash new password
    const password = await bcrypt.hash(args.password, 10);
    // 4. Save password and cleanup
    const updatedUser = await ctx.db.mutation.updateUser({
      where: {
        email: user.email
      },
      data: {
        password,
        resetToken: null,
        resetTokenExpiry: null
      }
    });
    // 5. JWT stuff
    const token = jwt.sign({ userId: updatedUser.id }, process.env.APP_SECRET);
    ctx.response.cookie("token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365
    });
    // 6. Return user
    return updatedUser;
  },

  async updatePermissions(parent, args, ctx, info) {
    // Confirm login
    if (!ctx.request.userId) {
      throw new Error("You must be signed in.");
    }
    // Query current user
    const user = await ctx.db.query.user(
      {
        where: { id: ctx.request.userId }
      },
      info
    );
    // Validate they have permission to do this
    hasPermission(user, ["ADMIN", "PERMISSIONUPDATE"]);
    // Update permissions
    return ctx.db.mutation.updateUser(
      {
        data: {
          permissions: {
            // Prisma requires us to use this 'set' thing
            set: args.permissions
          }
        },
        where: {
          id: args.userId
        }
      },
      info
    );
  }
};

module.exports = mutations;
