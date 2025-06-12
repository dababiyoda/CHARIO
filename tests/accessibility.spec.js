/**
 * @jest-environment jsdom
 */
const React = require('react');
const { render } = require('@testing-library/react');
const { axe, toHaveNoViolations } = require('jest-axe');

const BookingForm = require('../frontend/BookingForm.jsx').default || require('../frontend/BookingForm.jsx');

expect.extend(toHaveNoViolations);

test('BookingForm is accessible', async () => {
  const { container } = render(React.createElement(BookingForm));
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
