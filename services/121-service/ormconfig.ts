import fs from 'fs';

export const ORMConfig = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: 5432,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DBNAME,
  schema: '121-service',
  entities: ['src/**/**.entity.ts'],
  subscribers: ['src/**/**.subscriber.ts'],
  migrationsTableName: 'custom_migration_table',
  migrations: ['migration/*.ts'],
  dropSchema: false,
  synchronize: false,
  ssl: {
    ca: fs.readFileSync('cert/DigiCertGlobalRootCA.crt.pem').toString(),
  },
};
