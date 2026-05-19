const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { ApolloServer } = require('@apollo/server');
const { typeDefs } = require('./graphql/schema');
const { resolvers } = require('./graphql/resolvers');
const restRouter = require('./rest/routes');

const PORT = process.env.PORT || 3000;

// ────────────────────────────────────────────────────────────
// Apollo GraphQL Server
// ────────────────────────────────────────────────────────────

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true
});

// ────────────────────────────────────────────────────────────
// Start Server
// ────────────────────────────────────────────────────────────

async function startServer() {
  await server.start();

  // ────────────────────────────────────────────────────────────
  // Express Setup
  // ────────────────────────────────────────────────────────────

  const app = express();

  app.use(cors());
  app.use(bodyParser.json());
  app.use('/', restRouter);

  // GraphQL endpoint
  app.post('/graphql', bodyParser.json(), async (req, res) => {
    try {
      const { query, variables } = req.body;
      const result = await server.executeOperation(
        { query, variables },
        { req, res }
      );
      if (result.body.kind === 'single') {
        res.status(200).json(result.body.singleResult);
      }
    } catch (err) {
      res.status(500).json({ errors: [{ message: err.message }] });
    }
  });

  // GraphQL GET endpoint (for Apollo Sandbox via web)
  app.get('/graphql', (req, res) => {
    res.type('text/html').send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Apollo Sandbox</title>
          <script src="https://embeddable-sandbox.cdn.apollographql.com/_latest/embeddable-sandbox.umd.production.min.js"></script>
        </head>
        <body>
          <div style="height: 100%; width: 100%; margin: 0; overflow: hidden;">
            <div id="embedded-sandbox" style="height:100vh; width:100%;"></div>
          </div>
          <script>
            new window.EmbeddedSandbox({
              target: "#embedded-sandbox",
              initialState: {
                document: "{ __typename }",
                variables: {},
                headers: {},
                url: "http://localhost:${PORT}/graphql",
              },
            });
          </script>
        </body>
      </html>
    `);
  });

  app.listen(PORT, () => {
    console.log(`[api-gateway] REST API ready at http://localhost:${PORT}`);
    console.log(`[api-gateway] GraphQL ready at http://localhost:${PORT}/graphql`);
  });
}

startServer().catch(err => {
  console.error('[api-gateway] Failed to start:', err);
  process.exit(1);
});

module.exports = { server };
