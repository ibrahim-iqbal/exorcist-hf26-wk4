/** Demo package.json with intentionally problematic deps for showcase */
export const DEMO_PACKAGE_JSON = JSON.stringify(
  {
    name: 'haunted-project',
    version: '1.0.0',
    license: 'MIT',
    dependencies: {
      react: '^18.2.0',
      'react-dom': '^18.2.0',
      lodash: '^4.17.21',
      underscore: '^1.13.6',
      moment: '^2.29.4',
      'date-fns': '^2.30.0',
      axios: '^1.6.0',
      'node-fetch': '^3.3.2',
      express: '^4.18.2',
      chalk: '^5.3.0',
      'left-pad': '^1.3.0',
      request: '^2.88.2',
    },
    devDependencies: {
      typescript: '^5.3.0',
      webpack: '^5.89.0',
      'ts-node': '^10.9.2',
    },
  },
  null,
  2,
);
