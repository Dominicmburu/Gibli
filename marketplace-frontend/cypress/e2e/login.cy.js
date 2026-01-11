// Test to verify user can log in with valid credentials
describe('User can log in with valid credentials', () => {
	it('visits the login page and logs in', () => {
		cy.visit('/login');
		cy.get('input[name="username"]').type('validUser');
		cy.get('input[name="password"]').type('validPassword');
		cy.get('button[type="submit"]').click();
		cy.url().should('include', '/dashboard');
		cy.contains('Welcome, validUser');
	});
});
