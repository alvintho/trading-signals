import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignInPage from '@/app/(auth)/sign-in/page';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
}));

// Mock sonner toast
const mockToastError = jest.fn();
jest.mock('sonner', () => ({
    toast: {
        error: (...args: any[]) => mockToastError(...args),
    },
}));

// Mock auth action
const mockSignInWithEmail = jest.fn();
jest.mock('@/lib/actions/auth.actions', () => ({
    signInWithEmail: (...args: any[]) => mockSignInWithEmail(...args),
}));

// Minimal mocks for components not under test
jest.mock('@/components/forms/FooterLink', () => ({
    __esModule: true,
    default: ({ text, linkText, href }: { text: string; linkText: string; href: string }) => (
        <div>
            <span>{text}</span>
            <a href={href}>{linkText}</a>
        </div>
    ),
}));

describe('SignInPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('rendering', () => {
        it('renders the page heading', () => {
            render(<SignInPage />);
            expect(screen.getByText('Welcome Back')).toBeInTheDocument();
        });

        it('renders the email input field', () => {
            render(<SignInPage />);
            expect(screen.getByLabelText('Email')).toBeInTheDocument();
        });

        it('renders the password input field', () => {
            render(<SignInPage />);
            expect(screen.getByLabelText('Password')).toBeInTheDocument();
        });

        it('renders the Sign In submit button', () => {
            render(<SignInPage />);
            expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
        });

        it('renders the footer link to sign-up page', () => {
            render(<SignInPage />);
            expect(screen.getByText('Create an account')).toBeInTheDocument();
        });
    });

    describe('form submission - success', () => {
        it('calls router.push("/") when sign-in returns success: true', async () => {
            mockSignInWithEmail.mockResolvedValue({ success: true, data: { user: { id: '1' } } });
            render(<SignInPage />);

            await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
            await userEvent.type(screen.getByLabelText('Password'), 'password123');
            fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }).closest('form')!);

            await waitFor(() => {
                expect(mockPush).toHaveBeenCalledWith('/');
            });
        });

        it('does not call toast.error when sign-in succeeds', async () => {
            mockSignInWithEmail.mockResolvedValue({ success: true, data: {} });
            render(<SignInPage />);

            await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
            await userEvent.type(screen.getByLabelText('Password'), 'password123');
            fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }).closest('form')!);

            await waitFor(() => {
                expect(mockPush).toHaveBeenCalled();
            });
            expect(mockToastError).not.toHaveBeenCalled();
        });
    });

    describe('form submission - server-side failure', () => {
        it('calls toast.error with result.error when sign-in returns success: false with an error', async () => {
            mockSignInWithEmail.mockResolvedValue({ success: false, error: 'Invalid credentials provided' });
            render(<SignInPage />);

            await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
            await userEvent.type(screen.getByLabelText('Password'), 'password123');
            fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }).closest('form')!);

            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Sign in failed.', {
                    description: 'Invalid credentials provided',
                    descriptionClassName: 'text-red-300!',
                });
            });
        });

        it('falls back to "Invalid credentials" description when result.error is absent', async () => {
            mockSignInWithEmail.mockResolvedValue({ success: false, error: undefined });
            render(<SignInPage />);

            await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
            await userEvent.type(screen.getByLabelText('Password'), 'password123');
            fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }).closest('form')!);

            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Sign in failed.', {
                    description: 'Invalid credentials',
                    descriptionClassName: 'text-red-300!',
                });
            });
        });

        it('does not call router.push when sign-in returns success: false', async () => {
            mockSignInWithEmail.mockResolvedValue({ success: false, error: 'Wrong password' });
            render(<SignInPage />);

            await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
            await userEvent.type(screen.getByLabelText('Password'), 'password123');
            fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }).closest('form')!);

            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalled();
            });
            expect(mockPush).not.toHaveBeenCalled();
        });
    });

    describe('form submission - network/unexpected error', () => {
        it('calls toast.error with network error message when signInWithEmail throws', async () => {
            mockSignInWithEmail.mockRejectedValue(new Error('fetch failed'));
            render(<SignInPage />);

            await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
            await userEvent.type(screen.getByLabelText('Password'), 'password123');
            fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }).closest('form')!);

            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Sign in failed.', {
                    description: 'A network error occurred. Please check your connection.',
                    descriptionClassName: 'text-red-300!',
                });
            });
        });

        it('does not call router.push when signInWithEmail throws', async () => {
            mockSignInWithEmail.mockRejectedValue(new Error('Network failure'));
            render(<SignInPage />);

            await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
            await userEvent.type(screen.getByLabelText('Password'), 'password123');
            fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }).closest('form')!);

            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalled();
            });
            expect(mockPush).not.toHaveBeenCalled();
        });
    });

    describe('form validation', () => {
        it('does not submit when email is empty', async () => {
            render(<SignInPage />);

            await userEvent.type(screen.getByLabelText('Password'), 'password123');
            fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }).closest('form')!);

            await waitFor(() => {
                expect(screen.getByText('Email is required')).toBeInTheDocument();
            });
            expect(mockSignInWithEmail).not.toHaveBeenCalled();
        });

        it('does not submit when password is empty', async () => {
            render(<SignInPage />);

            await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
            fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }).closest('form')!);

            await waitFor(() => {
                expect(screen.getByText('Password is required')).toBeInTheDocument();
            });
            expect(mockSignInWithEmail).not.toHaveBeenCalled();
        });

        it('shows "Invalid email address" for malformed email on blur', async () => {
            render(<SignInPage />);
            const emailInput = screen.getByLabelText('Email');

            await userEvent.type(emailInput, 'notanemail');
            fireEvent.blur(emailInput);

            await waitFor(() => {
                expect(screen.getByText('Invalid email address')).toBeInTheDocument();
            });
        });

        it('shows "Password must be at least 8 characters" for short password on blur', async () => {
            render(<SignInPage />);
            const passwordInput = screen.getByLabelText('Password');

            await userEvent.type(passwordInput, 'short');
            fireEvent.blur(passwordInput);

            await waitFor(() => {
                expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
            });
        });

        it('passes email validation for a valid email format', async () => {
            mockSignInWithEmail.mockResolvedValue({ success: true, data: {} });
            render(<SignInPage />);

            await userEvent.type(screen.getByLabelText('Email'), 'valid@domain.com');
            await userEvent.type(screen.getByLabelText('Password'), 'validpassword');
            fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }).closest('form')!);

            await waitFor(() => {
                expect(mockSignInWithEmail).toHaveBeenCalled();
            });
            expect(screen.queryByText('Invalid email address')).not.toBeInTheDocument();
        });
    });
});