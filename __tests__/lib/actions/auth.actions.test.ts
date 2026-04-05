import { signUpWithEmail, signInWithEmail } from '@/lib/actions/auth.actions';

// Mock next/headers (required by the 'use server' module)
jest.mock('next/headers', () => ({
    headers: jest.fn().mockResolvedValue(new Headers()),
}));

// Mock better-auth instance
const mockSignUpEmail = jest.fn();
const mockSignInEmail = jest.fn();

jest.mock('@/lib/better-auth/auth', () => ({
    auth: {
        api: {
            signUpEmail: (...args: any[]) => mockSignUpEmail(...args),
            signInEmail: (...args: any[]) => mockSignInEmail(...args),
        },
    },
}));

// Mock inngest client
const mockInngestSend = jest.fn();
jest.mock('@/lib/inngest/client', () => ({
    inngest: {
        send: (...args: any[]) => mockInngestSend(...args),
    },
}));

const validSignUpData: SignUpFormData = {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    password: 'securepassword123',
    confirmPassword: 'securepassword123',
    country: 'US',
    investmentGoals: 'Growth',
    riskTolerance: 'Medium',
    preferredIndustry: 'Technology',
};

const validSignInData: SignInFormData = {
    email: 'jane@example.com',
    password: 'securepassword123',
};

describe('signUpWithEmail', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('returns success: true and data when sign-up succeeds', async () => {
        const mockResponse = { user: { id: '1', email: 'jane@example.com' } };
        mockSignUpEmail.mockResolvedValue(mockResponse);
        mockInngestSend.mockResolvedValue(undefined);

        const result = await signUpWithEmail(validSignUpData);

        expect(result).toEqual({ success: true, data: mockResponse });
    });

    it('calls auth.api.signUpEmail with correct email, password, and fullName', async () => {
        const mockResponse = { user: { id: '1' } };
        mockSignUpEmail.mockResolvedValue(mockResponse);
        mockInngestSend.mockResolvedValue(undefined);

        await signUpWithEmail(validSignUpData);

        expect(mockSignUpEmail).toHaveBeenCalledWith({
            body: {
                email: 'jane@example.com',
                password: 'securepassword123',
                name: 'Jane Doe',
            },
        });
    });

    it('sends inngest event with user profile data when auth succeeds', async () => {
        const mockResponse = { user: { id: '1' } };
        mockSignUpEmail.mockResolvedValue(mockResponse);
        mockInngestSend.mockResolvedValue(undefined);

        await signUpWithEmail(validSignUpData);

        expect(mockInngestSend).toHaveBeenCalledWith({
            name: 'app/user.created',
            data: {
                email: 'jane@example.com',
                name: 'Jane Doe',
                country: 'US',
                investmentGoals: 'Growth',
                riskTolerance: 'Medium',
                preferredIndustry: 'Technology',
            },
        });
    });

    it('does not call inngest.send when auth response is falsy', async () => {
        mockSignUpEmail.mockResolvedValue(null);

        await signUpWithEmail(validSignUpData);

        expect(mockInngestSend).not.toHaveBeenCalled();
    });

    it('returns success: false with e.message when auth throws an error with a message', async () => {
        const error = new Error('Email already registered');
        mockSignUpEmail.mockRejectedValue(error);

        const result = await signUpWithEmail(validSignUpData);

        expect(result).toEqual({ success: false, error: 'Email already registered' });
    });

    it('returns fallback error string when thrown error has no message', async () => {
        // An error object with an empty message property
        mockSignUpEmail.mockRejectedValue({ message: '' });

        const result = await signUpWithEmail(validSignUpData);

        expect(result).toEqual({ success: false, error: 'Sign Up Failed' });
    });

    it('returns fallback error string when thrown value has no message property', async () => {
        mockSignUpEmail.mockRejectedValue('some string error');

        const result = await signUpWithEmail(validSignUpData);

        expect(result).toEqual({ success: false, error: 'Sign Up Failed' });
    });

    it('returns success: false (not throwing) even on auth failure', async () => {
        mockSignUpEmail.mockRejectedValue(new Error('Network error'));

        await expect(signUpWithEmail(validSignUpData)).resolves.toMatchObject({
            success: false,
        });
    });
});

describe('signInWithEmail', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('returns success: true and data when sign-in succeeds', async () => {
        const mockResponse = { user: { id: '1', email: 'jane@example.com' }, token: 'abc' };
        mockSignInEmail.mockResolvedValue(mockResponse);

        const result = await signInWithEmail(validSignInData);

        expect(result).toEqual({ success: true, data: mockResponse });
    });

    it('calls auth.api.signInEmail with correct email and password', async () => {
        mockSignInEmail.mockResolvedValue({ user: { id: '1' } });

        await signInWithEmail(validSignInData);

        expect(mockSignInEmail).toHaveBeenCalledWith({
            body: { email: 'jane@example.com', password: 'securepassword123' },
        });
    });

    it('returns success: false with e.message when auth throws an error with a message', async () => {
        const error = new Error('Invalid credentials');
        mockSignInEmail.mockRejectedValue(error);

        const result = await signInWithEmail(validSignInData);

        expect(result).toEqual({ success: false, error: 'Invalid credentials' });
    });

    it('returns fallback error string when thrown error has no message', async () => {
        mockSignInEmail.mockRejectedValue({ message: '' });

        const result = await signInWithEmail(validSignInData);

        expect(result).toEqual({ success: false, error: 'Sign In Failed' });
    });

    it('returns fallback error string when thrown value has no message property', async () => {
        // An object (not an Error) with no message property: e.message is undefined
        mockSignInEmail.mockRejectedValue({ code: 503 });

        const result = await signInWithEmail(validSignInData);

        expect(result).toEqual({ success: false, error: 'Sign In Failed' });
    });

    it('returns success: false (not throwing) even on auth failure', async () => {
        mockSignInEmail.mockRejectedValue(new Error('Server down'));

        await expect(signInWithEmail(validSignInData)).resolves.toMatchObject({
            success: false,
        });
    });

    it('preserves the exact error message from the thrown error', async () => {
        const specificMessage = 'Account locked after too many attempts';
        mockSignInEmail.mockRejectedValue(new Error(specificMessage));

        const result = await signInWithEmail(validSignInData);

        expect(result).toEqual({ success: false, error: specificMessage });
    });
});