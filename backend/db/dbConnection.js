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
	pool: {
		max: 10,
		min: 0,
		idleTimeoutMillis: 30000,
	},
	options: {
		encrypt: true, // for azure
		trustServerCertificate: true, // change to true for local dev / self-signed certs
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
