import mssql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const sqlConfig = {
	user: process.env.DB_USER,
	password: process.env.DB_PWD,
	database: process.env.DB_NAME,
	server: process.env.DB_SERVER,
	port: parseInt(process.env.DB_PORT || '1433', 10),
	pool: {
		max: 10,
		min: 0,
		idleTimeoutMillis: 30000,
	},
	options: {
		encrypt: process.env.DB_ENCRYPT !== 'false',
		// Set DB_TRUST_CERT=true for local dev or when using Cloud SQL Auth Proxy
		trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
	},
};
//test connection
async function test() {
	try {
		const pool = await mssql.connect(sqlConfig);
		const result = await pool.request().query('SELECT * FROM Users');
		console.log(result.recordset);
		await pool.close(); // close the pool after use
	} catch (error) {
		console.error('DB connection error:', error);
	}
}

//test();

export default sqlConfig;
