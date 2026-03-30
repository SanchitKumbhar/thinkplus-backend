const applyCascadeDelete = (schema, buildCascades) => {
  const getCascades = (doc) => {
    if (!doc || typeof buildCascades !== "function") {
      return [];
    }

    const cascades = buildCascades(doc);
    return Array.isArray(cascades) ? cascades : [];
  };

  const executeCascade = async (doc) => {
    const cascades = getCascades(doc);

    for (const cascade of cascades) {
      if (!cascade || !cascade.model || !cascade.action || !cascade.filter) {
        continue;
      }

      const Model = typeof cascade.model === "function" ? cascade.model() : cascade.model;
      if (!Model || typeof Model[cascade.action] !== "function") {
        continue;
      }

      const filter = typeof cascade.filter === "function" ? cascade.filter(doc) : cascade.filter;
      if (!filter) {
        continue;
      }

      if (cascade.action.startsWith("update")) {
        const update = typeof cascade.update === "function" ? cascade.update(doc) : cascade.update;
        if (!update) {
          continue;
        }

        await Model[cascade.action](filter, update);
      } else {
        await Model[cascade.action](filter);
      }
    }
  };

  schema.pre("findOneAndDelete", async function cascadeFindOneAndDeletePre(next) {
    try {
      this._cascadeDeletedDoc = await this.model.findOne(this.getFilter());
      next();
    } catch (error) {
      next(error);
    }
  });

  schema.pre("deleteOne", { document: false, query: true }, async function cascadeDeleteOneQueryPre(next) {
    try {
      this._cascadeDeletedDoc = await this.model.findOne(this.getFilter());
      next();
    } catch (error) {
      next(error);
    }
  });

  schema.post("deleteOne", { document: false, query: true }, async function cascadeDeleteOneQueryPost(result, next) {
    try {
      await executeCascade(this._cascadeDeletedDoc);
      next();
    } catch (error) {
      next(error);
    }
  });

  schema.pre("deleteMany", async function cascadeDeleteManyPre(next) {
    try {
      this._cascadeDeletedDocs = await this.model.find(this.getFilter());
      next();
    } catch (error) {
      next(error);
    }
  });

  schema.post("deleteMany", async function cascadeDeleteManyPost(result, next) {
    try {
      const docs = Array.isArray(this._cascadeDeletedDocs) ? this._cascadeDeletedDocs : [];
      for (const doc of docs) {
        await executeCascade(doc);
      }
      next();
    } catch (error) {
      next(error);
    }
  });

  schema.post("findOneAndDelete", async function cascadeFindOneAndDeletePost(doc, next) {
    try {
      await executeCascade(doc || this._cascadeDeletedDoc);
      next();
    } catch (error) {
      next(error);
    }
  });

  schema.post("deleteOne", { document: true, query: false }, async function cascadeDeleteOnePost(next) {
    try {
      await executeCascade(this);
      next();
    } catch (error) {
      next(error);
    }
  });
};

module.exports = { applyCascadeDelete };
