import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignUpPage from '@/app/(auth)/sign-up/page';

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
const mockSignUpWithEmail = jest.fn();
jest.mock('@/lib/actions/auth.actions', () => ({
    signUpWithEmail: (...args: any[]) => mockSignUpWithEmail(...args),
}));

// Mock heavy subcomponents not under test
jest.mock('@/components/forms/CountrySelectField', () => ({
    CountrySelectField: () => <div data-testid="country-select" />,
}));

jest.mock('@/components/forms/SelectField', () => ({
    __esModule: true,
    default: ({ name, label }: { name: string; label: string }) => (
        <div data-testid={`select-${name}`} aria-label={label} />
    ),
}));

jest.mock('@/components/forms/FooterLink', () => ({
    __esModule: true,
    default: ({ text, linkText, href }: { text: string; linkText: string; href: string }) => (
        <div>
            <span>{text}</span>
            <a href={href}>{linkText}</a>
        </div>
    ),
}));

/**
 * Helper: fill in the minimum required fields for a valid sign-up submission.
 * (CountrySelectField and SelectField are mocked, so their defaults pass validation.)
 */
async function fillValidSignUpForm({
    fullName = 'Jane Doe',
    email = 'jane@example.com',
    password = 'securepass',
    confirmPassword = 'securepass',
}: {
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
} = {}) {
    if (fullName) await userEvent.type(screen.getByLabelText('Full Name'), fullName);
    if (email) await userEvent.type(screen.getByLabelText('Email'), email);
    if (password) await userEvent.type(screen.getByLabelText('Password'), password);
    if (confirmPassword) await userEvent.type(screen.getByLabelText('Confirm Password'), confirmPassword);
}

describe('SignUpPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('rendering', () => {
        it('renders the page heading', () => {
            render(<SignUpPage />);
            expect(screen.getByText('Sign Up & Personalize')).toBeInTheDocument();
        });

        it('renders the Full Name input field', () => {
            render(<SignUpPage />);
            expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
        });

        it('renders the Email input field', () => {
            render(<SignUpPage />);
            expect(screen.getByLabelText('Email')).toBeInTheDocument();
        });

        it('renders the Password input field', () => {
            render(<SignUpPage />);
            expect(screen.getByLabelText('Password')).toBeInTheDocument();
        });

        it('renders the Confirm Password input field', () => {
            render(<SignUpPage />);
            expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
        });

        it('renders the submit button', () => {
            render(<SignUpPage />);
            expect(screen.getByRole('button', { name: 'Start Your Investing Journey' })).toBeInTheDocument();
        });

        it('renders the footer link to sign-in page', () => {
            render(<SignUpPage />);
            expect(screen.getByText('Sign in')).toBeInTheDocument();
        });
    });

    describe('form submission - success', () => {
        it('calls router.push("/") when sign-up returns success: true', async () => {
            mockSignUpWithEmail.mockResolvedValue({ success: true, data: { user: { id: '1' } } });
            render(<SignUpPage />);

            await fillValidSignUpForm();
            fireEvent.submit(
                screen.getByRole('button', { name: 'Start Your Investing Journey' }).closest('form')!
            );

            await waitFor(() => {
                expect(mockPush).toHaveBeenCalledWith('/');
            });
        });

        it('does not call toast.error when sign-up succeeds', async () => {
            mockSignUpWithEmail.mockResolvedValue({ success: true, data: {} });
            render(<SignUpPage />);

            await fillValidSignUpForm();
            fireEvent.submit(
                screen.getByRole('button', { name: 'Start Your Investing Journey' }).closest('form')!
            );

            await waitFor(() => {
                expect(mockPush).toHaveBeenCalled();
            });
            expect(mockToastError).not.toHaveBeenCalled();
        });
    });

    describe('form submission - server-side failure', () => {
        it('calls toast.error with result.error when sign-up returns success: false with an error', async () => {
            mockSignUpWithEmail.mockResolvedValue({
                success: false,
                error: 'Email already in use',
            });
            render(<SignUpPage />);

            await fillValidSignUpForm();
            fireEvent.submit(
                screen.getByRole('button', { name: 'Start Your Investing Journey' }).closest('form')!
            );

            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Sign up failed.', {
                    description: 'Email already in use',
                    descriptionClassName: 'text-red-300!',
                });
            });
        });

        it('falls back to "Failed to create an account" when result.error is absent', async () => {
            mockSignUpWithEmail.mockResolvedValue({ success: false, error: undefined });
            render(<SignUpPage />);

            await fillValidSignUpForm();
            fireEvent.submit(
                screen.getByRole('button', { name: 'Start Your Investing Journey' }).closest('form')!
            );

            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Sign up failed.', {
                    description: 'Failed to create an account',
                    descriptionClassName: 'text-red-300!',
                });
            });
        });

        it('does not call router.push when sign-up returns success: false', async () => {
            mockSignUpWithEmail.mockResolvedValue({ success: false, error: 'Server error' });
            render(<SignUpPage />);

            await fillValidSignUpForm();
            fireEvent.submit(
                screen.getByRole('button', { name: 'Start Your Investing Journey' }).closest('form')!
            );

            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalled();
            });
            expect(mockPush).not.toHaveBeenCalled();
        });
    });

    describe('form submission - network/unexpected error', () => {
        it('calls toast.error with network error message when signUpWithEmail throws', async () => {
            mockSignUpWithEmail.mockRejectedValue(new Error('fetch failed'));
            render(<SignUpPage />);

            await fillValidSignUpForm();
            fireEvent.submit(
                screen.getByRole('button', { name: 'Start Your Investing Journey' }).closest('form')!
            );

            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Sign up failed.', {
                    description: 'A network error occurred. Please check your connection.',
                    descriptionClassName: 'text-red-300!',
                });
            });
        });

        it('does not call router.push when signUpWithEmail throws', async () => {
            mockSignUpWithEmail.mockRejectedValue(new Error('Network failure'));
            render(<SignUpPage />);

            await fillValidSignUpForm();
            fireEvent.submit(
                screen.getByRole('button', { name: 'Start Your Investing Journey' }).closest('form')!
            );

            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalled();
            });
            expect(mockPush).not.toHaveBeenCalled();
        });
    });

    describe('confirmPassword field validation', () => {
        it('shows "Confirm password is required" when confirmPassword is empty on submit', async () => {
            render(<SignUpPage />);

            await userEvent.type(screen.getByLabelText('Full Name'), 'Jane Doe');
            await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
            await userEvent.type(screen.getByLabelText('Password'), 'securepass');
            // Leave confirmPassword empty
            fireEvent.submit(
                screen.getByRole('button', { name: 'Start Your Investing Journey' }).closest('form')!
            );

            await waitFor(() => {
                expect(screen.getByText('Confirm password is required')).toBeInTheDocument();
            });
            expect(mockSignUpWithEmail).not.toHaveBeenCalled();
        });

        it('shows "Password does not match" when confirmPassword differs from password', async () => {
            render(<SignUpPage />);

            await userEvent.type(screen.getByLabelText('Full Name'), 'Jane Doe');
            await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
            await userEvent.type(screen.getByLabelText('Password'), 'securepass');
            await userEvent.type(screen.getByLabelText('Confirm Password'), 'differentpass');
            fireEvent.submit(
                screen.getByRole('button', { name: 'Start Your Investing Journey' }).closest('form')!
            );

            await waitFor(() => {
                expect(screen.getByText('Password does not match')).toBeInTheDocument();
            });
            expect(mockSignUpWithEmail).not.toHaveBeenCalled();
        });

        it('does not show a mismatch error when confirmPassword matches password', async () => {
            mockSignUpWithEmail.mockResolvedValue({ success: true, data: {} });
            render(<SignUpPage />);

            await fillValidSignUpForm({ password: 'matchingpass', confirmPassword: 'matchingpass' });
            fireEvent.submit(
                screen.getByRole('button', { name: 'Start Your Investing Journey' }).closest('form')!
            );

            await waitFor(() => {
                expect(mockSignUpWithEmail).toHaveBeenCalled();
            });
            expect(screen.queryByText('Password does not match')).not.toBeInTheDocument();
        });

        it('shows mismatch error on blur when confirmPassword does not match password', async () => {
            render(<SignUpPage />);

            await userEvent.type(screen.getByLabelText('Password'), 'securepass');
            const confirmInput = screen.getByLabelText('Confirm Password');
            await userEvent.type(confirmInput, 'wrongpass');
            fireEvent.blur(confirmInput);

            await waitFor(() => {
                expect(screen.getByText('Password does not match')).toBeInTheDocument();
            });
        });
    });

    describe('email and password validation', () => {
        it('shows "Email is required" when email is empty on submit', async () => {
            render(<SignUpPage />);

            await userEvent.type(screen.getByLabelText('Full Name'), 'Jane Doe');
            await userEvent.type(screen.getByLabelText('Password'), 'securepass');
            await userEvent.type(screen.getByLabelText('Confirm Password'), 'securepass');
            fireEvent.submit(
                screen.getByRole('button', { name: 'Start Your Investing Journey' }).closest('form')!
            );

            await waitFor(() => {
                expect(screen.getByText('Email is required')).toBeInTheDocument();
            });
            expect(mockSignUpWithEmail).not.toHaveBeenCalled();
        });

        it('shows "Invalid email address" for malformed email on blur', async () => {
            render(<SignUpPage />);
            const emailInput = screen.getByLabelText('Email');

            await userEvent.type(emailInput, 'notanemail');
            fireEvent.blur(emailInput);

            await waitFor(() => {
                expect(screen.getByText('Invalid email address')).toBeInTheDocument();
            });
        });

        it('shows "Password must be at least 8 characters" for short password on blur', async () => {
            render(<SignUpPage />);
            const passwordInput = screen.getByLabelText('Password');

            await userEvent.type(passwordInput, 'short');
            fireEvent.blur(passwordInput);

            await waitFor(() => {
                expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
            });
        });
    });
});