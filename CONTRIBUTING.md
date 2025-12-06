# Contributing to FHEVM Privacy Health Monitor

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Development Setup

1. Fork and clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
4. Run tests to ensure everything works:
   ```bash
   npm test
   ```

## Development Workflow

1. Create a new branch for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following our coding standards

3. Write or update tests for your changes

4. Run the test suite:
   ```bash
   npm test
   ```

5. Format your code:
   ```bash
   npm run format
   ```

6. Commit your changes with a descriptive message

7. Push to your fork and create a pull request

## Coding Standards

### Solidity

- Use Solidity 0.8.24
- Follow the official Solidity style guide
- Include NatSpec comments for all public functions
- Use descriptive variable and function names
- Minimize gas usage where possible

### TypeScript

- Use TypeScript for all test and script files
- Include TSDoc comments for test cases
- Follow existing code style
- Use meaningful variable names
- Keep functions focused and small

### Testing

- Write comprehensive tests for all functionality
- Include both positive and negative test cases
- Test edge cases and boundary conditions
- Use descriptive test names that explain what is being tested
- Include TSDoc comments explaining FHEVM concepts demonstrated

Example test structure:
```typescript
/**
 * @notice Test description
 * @dev Key concepts:
 *      - Concept 1
 *      - Concept 2
 *
 * @chapter chapter-name
 */
it("Should do something specific", async function () {
  // Test implementation
});
```

## Documentation

- Update README.md if you add new features
- Include TSDoc/JSDoc comments in code
- Update or add examples as needed
- Keep documentation clear and concise

## FHEVM Best Practices

When working with FHEVM:

1. Always use `FHE.allowThis()` for contract self-access
2. Grant explicit access with `FHE.allow()` when needed
3. Use appropriate encrypted types (euint8, euint16, etc.)
4. Handle decryption callbacks properly
5. Verify signatures in decryption callbacks
6. Test both encrypted and decrypted workflows

## Common Pitfalls to Avoid

- Don't forget `FHE.allowThis()` for contract storage
- Don't mix encrypted and plaintext operations
- Don't assume immediate decryption results
- Don't expose encrypted values without access control
- Don't skip signature verification in callbacks

## Pull Request Process

1. Ensure all tests pass
2. Update documentation as needed
3. Add a clear description of your changes
4. Reference any related issues
5. Wait for review and address feedback

## Code Review

All contributions go through code review. Reviewers will check:

- Code quality and style
- Test coverage
- Documentation completeness
- FHEVM best practices
- Security considerations
- Gas optimization

## Questions?

If you have questions, please:

1. Check existing documentation
2. Search existing issues
3. Open a new issue with your question

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
