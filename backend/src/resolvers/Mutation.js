const mutations = {
  async createItem(parent, args, ctx, info) {
    // TODO: auth
    const item = await ctx.db.mutation.createItem(
      {
        data: {
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
    const item = await ctx.db.query.item({ where }, `{ id title }`);
    // Check that user owns it
    // TODO
    // Delete it
    return ctx.db.mutation.deleteItem({ where }, info);
  }
};

module.exports = mutations;
