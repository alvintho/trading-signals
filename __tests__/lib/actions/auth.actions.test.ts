import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/headers before importing the module under test
vi.mock('next/headers', () => ({
    headers: vi.fn().mockResolvedValue({}),
}));

// Mock the auth module — top-level await in auth.ts makes a direct import risky,
// so we provide a factory that returns a stable mock object
vi.mock('@/lib/better-auth/auth', () => ({
    auth: {
        api: {
            signUpEmail: vi.fn(),
            signInEmail: vi.fn(),
            signOut: vi.fn(),
        },
    },
}));

vi.mock('@/lib/inngest/client', () => ({
    inngest: {
        send: vi.fn(),
    },
}));

import { signInWithEmail, signUpWithEmail } from '@/lib/actions/auth.actions';
import { auth } from '@/lib/better-auth/auth';
import { inngest } from '@/lib/inngest/client';

const mockAuth = auth as {
    api: {
        signUpEmail: ReturnType<typeof vi.fn>;
        signInEmail: ReturnType<typeof vi.fn>;
    };
};
const mockInngest = inngest as { send: ReturnType<typeof vi.fn> };

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const validSignInData: SignInFormData = {
    email: 'user@example.com',
    password: 'secret123',
};

const validSignUpData: SignUpFormData = {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    password: 'secure123',
    confirmPassword: 'secure123',
    country: 'US',
    investmentGoals: 'Growth',
    riskTolerance: 'Medium',
    preferredIndustry: 'Technology',
};

// ---------------------------------------------------------------------------
// signInWithEmail
// ---------------------------------------------------------------------------

describe('signInWithEmail', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns success:true with data when auth.api.signInEmail resolves', async () => {
        const fakeResponse = { user: { id: '1', email: validSignInData.email } };
        mockAuth.api.signInEmail.mockResolvedValueOnce(fakeResponse);

        const result = await signInWithEmail(validSignInData);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(fakeResponse);
    });

    it('calls auth.api.signInEmail with the provided email and password', async () => {
        mockAuth.api.signInEmail.mockResolvedValueOnce({});

        await signInWithEmail(validSignInData);

        expect(mockAuth.api.signInEmail).toHaveBeenCalledOnce();
        expect(mockAuth.api.signInEmail).toHaveBeenCalledWith({
            body: { email: validSignInData.email, password: validSignInData.password },
        });
    });

    it('returns success:false with e.message when auth throws an error with a message', async () => {
        mockAuth.api.signInEmail.mockRejectedValueOnce(new Error('Invalid credentials'));

        const result = await signInWithEmail(validSignInData);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid credentials');
    });

    it('falls back to "Sign In Failed" when the thrown error has no message', async () => {
        const errorWithoutMessage = { code: 'UNKNOWN' }; // plain object, no .message
        mockAuth.api.signInEmail.mockRejectedValueOnce(errorWithoutMessage);

        const result = await signInWithEmail(validSignInData);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Sign In Failed');
    });

    it('returns success:false with empty-string error message when error.message is empty string', async () => {
        // e.message is falsy (empty string) → should fall back to default
        mockAuth.api.signInEmail.mockRejectedValueOnce(new Error(''));

        const result = await signInWithEmail(validSignInData);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Sign In Failed');
    });

    it('does not throw — always returns a result object even on failure', async () => {
        mockAuth.api.signInEmail.mockRejectedValueOnce(new Error('Network failure'));

        await expect(signInWithEmail(validSignInData)).resolves.toBeDefined();
    });
});

// ---------------------------------------------------------------------------
// signUpWithEmail
// ---------------------------------------------------------------------------

describe('signUpWithEmail', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns success:true with data when auth.api.signUpEmail resolves', async () => {
        const fakeResponse = { user: { id: '2', email: validSignUpData.email } };
        mockAuth.api.signUpEmail.mockResolvedValueOnce(fakeResponse);
        mockInngest.send.mockResolvedValueOnce(undefined);

        const result = await signUpWithEmail(validSignUpData);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(fakeResponse);
    });

    it('calls auth.api.signUpEmail with email, password, and name', async () => {
        mockAuth.api.signUpEmail.mockResolvedValueOnce({});
        mockInngest.send.mockResolvedValueOnce(undefined);

        await signUpWithEmail(validSignUpData);

        expect(mockAuth.api.signUpEmail).toHaveBeenCalledOnce();
        expect(mockAuth.api.signUpEmail).toHaveBeenCalledWith({
            body: {
                email: validSignUpData.email,
                password: validSignUpData.password,
                name: validSignUpData.fullName,
            },
        });
    });

    it('fires an inngest "app/user.created" event after successful sign-up', async () => {
        const fakeResponse = { user: { id: '2' } };
        mockAuth.api.signUpEmail.mockResolvedValueOnce(fakeResponse);
        mockInngest.send.mockResolvedValueOnce(undefined);

        await signUpWithEmail(validSignUpData);

        expect(mockInngest.send).toHaveBeenCalledOnce();
        expect(mockInngest.send).toHaveBeenCalledWith({
            name: 'app/user.created',
            data: {
                email: validSignUpData.email,
                name: validSignUpData.fullName,
                country: validSignUpData.country,
                investmentGoals: validSignUpData.investmentGoals,
                riskTolerance: validSignUpData.riskTolerance,
                preferredIndustry: validSignUpData.preferredIndustry,
            },
        });
    });

    it('does NOT fire inngest when auth.api.signUpEmail returns a falsy value', async () => {
        // auth returns null/undefined — response is falsy, inngest should not be triggered
        mockAuth.api.signUpEmail.mockResolvedValueOnce(null);

        await signUpWithEmail(validSignUpData);

        expect(mockInngest.send).not.toHaveBeenCalled();
    });

    it('returns success:false with e.message when auth throws an error with a message', async () => {
        mockAuth.api.signUpEmail.mockRejectedValueOnce(new Error('Email already in use'));

        const result = await signUpWithEmail(validSignUpData);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Email already in use');
    });

    it('falls back to "Sign Up Failed" when the thrown error has no message', async () => {
        mockAuth.api.signUpEmail.mockRejectedValueOnce({ code: 'UNKNOWN' });

        const result = await signUpWithEmail(validSignUpData);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Sign Up Failed');
    });

    it('does not call inngest when auth throws', async () => {
        mockAuth.api.signUpEmail.mockRejectedValueOnce(new Error('DB error'));

        await signUpWithEmail(validSignUpData);

        expect(mockInngest.send).not.toHaveBeenCalled();
    });

    it('does not throw — always returns a result object even on failure', async () => {
        mockAuth.api.signUpEmail.mockRejectedValueOnce(new Error('Unexpected'));

        await expect(signUpWithEmail(validSignUpData)).resolves.toBeDefined();
    });
});