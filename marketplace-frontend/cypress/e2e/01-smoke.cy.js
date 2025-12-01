describe('Smoke Test', () => {
	it('visits the homepage', () => {
		cy.visit('/login');
		cy.contains('Login');
	});
});
