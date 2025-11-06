//custom hook to leverage the role and perform role based rendering
import { useState, useEffect } from 'react';
import { getUserRole } from './userRole.js';

export const useRole = () => {
	const [role, setRole] = useState('');

	useEffect(() => {
		const r = getUserRole();
		setRole(r);
	}, []);

	return role;
};

//How to use
/**
 * In caller, assign a variable to the return value of useRole()- this function.
 * the variable will contain the decode role from token, gotten from the utility function userRole.js
 * then just wrap whatever you want to render conditionally in 
 *  <nav>
    {role === 'Seller' && <Link to='/seller-dashboard'>My Store</Link>}
    {role === 'Admin' && <Link to='/admin-dashboard'>Admin Panel</Link>}
    </nav>
 */
