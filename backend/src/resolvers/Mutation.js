const mutations = {
  async createItem(parent, args, ctx, info) {
    // TODO: auth
    console.log(ctx.db);

    const item = await ctx.db.mutation.createItem(
      {
        data: {
          ...args
        }
      },
      info
    );
    return item;
  }
};

module.exports = mutations;
