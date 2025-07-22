import mssql from 'mssql';
import sqlConfig from './dbConnection.js';

class DbHelper {
	constructor() {
		// Initialize the connection pool when an instance of DbHelper is created
		this.pool = mssql.connect(sqlConfig);
	}

	/**
	 * Prepares a request by adding input parameters.
	 * @param {mssql.Request} request - A new MSSQL request object.
	 * @param {Object} data - An object containing key-value pairs for input parameters.
	 * @returns {mssql.Request} The modified request object with input parameters.
	 */
	async createRequest(request, data) {
		Object.keys(data).forEach((key) => {
			request.input(key, data[key]); // Bind each parameter to the request
		});
		return request;
	}

	/**
	 * Executes a stored procedure with given parameters.
	 * @param {string} storedProcedure - The name of the stored procedure.
	 * @param {Object} data - Parameters required by the stored procedure.
	 * @returns {Promise<mssql.IResult<any>>} The result set of the procedure execution.
	 */
	async executeProcedure(storedProcedure, data) {
		try {
			const pool = await this.pool;
			const request = await this.createRequest(pool.request(), data);
			const results = await request.execute(storedProcedure);
			return results;
		} catch (error) {
			console.error('Error executing stored procedure----------:', error);
			throw error;
		}
	}
}

export default DbHelper;
