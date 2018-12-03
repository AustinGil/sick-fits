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
  }
};

module.exports = mutations;
