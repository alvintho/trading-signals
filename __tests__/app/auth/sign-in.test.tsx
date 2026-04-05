import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ---------------------------------------------------------------------------
// Mocks
// vi.mock factories are hoisted before variable declarations, so we use
// vi.hoisted() to create mock functions that are available in factory scope.
// ---------------------------------------------------------------------------

const { mockPush, mockToastError, mockSignInWithEmail } = vi.hoisted(() => ({
    mockPush: vi.fn(),
    mockToastError: vi.fn(),
    mockSignInWithEmail: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
}));

vi.mock('sonner', () => ({
    toast: { error: mockToastError },
}));

vi.mock('@/lib/actions/auth.actions', () => ({
    signInWithEmail: (...args: any[]) => mockSignInWithEmail(...args),
}));

// Render child form components as simple HTML so we avoid their own dependency chains
vi.mock('@/components/forms/InputField', () => ({
    default: ({ name, label, placeholder, type = 'text', register, error, validation }: any) => {
        const { ref, ...rest } = register(name, validation);
        return (
            <div>
                <label htmlFor={name}>{label}</label>
                <input id={name} name={name} placeholder={placeholder} type={type} ref={ref} {...rest} />
                {error && <p>{error.message}</p>}
            </div>
        );
    },
}));

vi.mock('@/components/ui/button', () => ({
    Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/forms/FooterLink', () => ({
    default: ({ text, linkText, href }: any) => (
        <a href={href}>{text} {linkText}</a>
    ),
}));

// ---------------------------------------------------------------------------
// Component import (after mocks)
// ---------------------------------------------------------------------------

import SignInPage from '@/app/(auth)/sign-in/page';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fillAndSubmit = async (email: string, password: string) => {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Email'), email);
    await user.type(screen.getByLabelText('Password'), password);
    await user.click(screen.getByRole('button', { name: /sign in/i }));
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SignInPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the sign-in form with email and password fields', () => {
        render(<SignInPage />);
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    // -----------------------------------------------------------------------
    // onSubmit – success path
    // -----------------------------------------------------------------------

    it('redirects to "/" when signInWithEmail returns success:true', async () => {
        mockSignInWithEmail.mockResolvedValueOnce({ success: true });

        render(<SignInPage />);
        await fillAndSubmit('user@example.com', 'password123');

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/');
        });
        expect(mockToastError).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // onSubmit – server-returned failure
    // -----------------------------------------------------------------------

    it('shows toast with result.error when signInWithEmail returns success:false with an error string', async () => {
        mockSignInWithEmail.mockResolvedValueOnce({ success: false, error: 'User not found' });

        render(<SignInPage />);
        await fillAndSubmit('user@example.com', 'password123');

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledWith(
                'Sign in failed.',
                expect.objectContaining({ description: 'User not found' }),
            );
        });
        expect(mockPush).not.toHaveBeenCalled();
    });

    it('falls back to "Invalid credentials" when result.error is undefined', async () => {
        mockSignInWithEmail.mockResolvedValueOnce({ success: false, error: undefined });

        render(<SignInPage />);
        await fillAndSubmit('user@example.com', 'password123');

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledWith(
                'Sign in failed.',
                expect.objectContaining({ description: 'Invalid credentials' }),
            );
        });
    });

    it('applies descriptionClassName "text-red-300!" to the server-error toast', async () => {
        mockSignInWithEmail.mockResolvedValueOnce({ success: false, error: 'Bad password' });

        render(<SignInPage />);
        await fillAndSubmit('user@example.com', 'password123');

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledWith(
                'Sign in failed.',
                expect.objectContaining({ descriptionClassName: 'text-red-300!' }),
            );
        });
    });

    // -----------------------------------------------------------------------
    // onSubmit – network / unexpected error (thrown exception)
    // -----------------------------------------------------------------------

    it('shows network error toast when signInWithEmail throws', async () => {
        mockSignInWithEmail.mockRejectedValueOnce(new Error('fetch failed'));

        render(<SignInPage />);
        await fillAndSubmit('user@example.com', 'password123');

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledWith(
                'Sign in failed.',
                expect.objectContaining({
                    description: 'A network error occurred. Please check your connection.',
                }),
            );
        });
        expect(mockPush).not.toHaveBeenCalled();
    });

    it('applies descriptionClassName "text-red-300!" to the network-error toast', async () => {
        mockSignInWithEmail.mockRejectedValueOnce(new Error('timeout'));

        render(<SignInPage />);
        await fillAndSubmit('user@example.com', 'password123');

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledWith(
                'Sign in failed.',
                expect.objectContaining({ descriptionClassName: 'text-red-300!' }),
            );
        });
    });

    // -----------------------------------------------------------------------
    // Email validation rules
    // -----------------------------------------------------------------------

    it('shows email required error when email is empty on blur', async () => {
        const user = userEvent.setup();
        render(<SignInPage />);

        const emailInput = screen.getByLabelText('Email');
        await user.click(emailInput);
        await user.tab(); // trigger onBlur

        await waitFor(() => {
            expect(screen.getByText('Email is required')).toBeInTheDocument();
        });
    });

    it('shows "Invalid email address" for malformed email', async () => {
        const user = userEvent.setup();
        render(<SignInPage />);

        await user.type(screen.getByLabelText('Email'), 'not-an-email');
        await user.tab();

        await waitFor(() => {
            expect(screen.getByText('Invalid email address')).toBeInTheDocument();
        });
    });

    it('accepts a correctly formatted email without showing an error', async () => {
        const user = userEvent.setup();
        render(<SignInPage />);

        await user.type(screen.getByLabelText('Email'), 'user@example.com');
        await user.tab();

        await waitFor(() => {
            expect(screen.queryByText('Invalid email address')).not.toBeInTheDocument();
        });
    });

    // -----------------------------------------------------------------------
    // Password validation rules
    // -----------------------------------------------------------------------

    it('shows password required error when password field is left empty', async () => {
        const user = userEvent.setup();
        render(<SignInPage />);

        const passwordInput = screen.getByLabelText('Password');
        await user.click(passwordInput);
        await user.tab();

        await waitFor(() => {
            expect(screen.getByText('Password is required')).toBeInTheDocument();
        });
    });

    it('shows "Password must be at least 8 characters" for a short password', async () => {
        const user = userEvent.setup();
        render(<SignInPage />);

        await user.type(screen.getByLabelText('Password'), 'short');
        await user.tab();

        await waitFor(() => {
            expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
        });
    });

    it('accepts a password of exactly 8 characters', async () => {
        const user = userEvent.setup();
        render(<SignInPage />);

        await user.type(screen.getByLabelText('Password'), '12345678');
        await user.tab();

        await waitFor(() => {
            expect(screen.queryByText('Password must be at least 8 characters')).not.toBeInTheDocument();
        });
    });

    // -----------------------------------------------------------------------
    // Does not navigate when form has validation errors
    // -----------------------------------------------------------------------

    it('does not call signInWithEmail when form has validation errors', async () => {
        const user = userEvent.setup();
        render(<SignInPage />);

        // Submit without filling anything
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(screen.getByText('Email is required')).toBeInTheDocument();
        });
        expect(mockSignInWithEmail).not.toHaveBeenCalled();
    });
});