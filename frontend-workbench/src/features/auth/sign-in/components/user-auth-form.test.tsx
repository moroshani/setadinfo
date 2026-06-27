import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { type Locator, userEvent } from 'vitest/browser'
import { UserAuthForm } from './user-auth-form'

const FORM_MESSAGES = {
  usernameEmpty: 'نام کاربری را وارد کنید.',
  passwordEmpty: 'رمز عبور را وارد کنید.',
} as const

const navigate = vi.fn()
const setUserMock = vi.fn()
const loginMock = vi.fn()
const getCurrentUserMock = vi.fn()

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    auth: {
      setUser: setUserMock,
    },
  }),
}))

vi.mock('@/lib/setad-api', () => ({
  login: loginMock,
  getCurrentUser: getCurrentUserMock,
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
    Link: ({
      children,
      to,
      className,
      ...rest
    }: {
      children?: React.ReactNode
      to: string
      className?: string
    }) => (
      <a href={to} className={className} {...rest}>
        {children}
      </a>
    ),
  }
})

describe('UserAuthForm', () => {
  describe('Rendering without redirectTo', () => {
    let screen: RenderResult
    let usernameInput: Locator
    let passwordInput: Locator
    let signInButton: Locator

    beforeEach(async () => {
      vi.clearAllMocks()
      loginMock.mockResolvedValue({ ok: true })
      getCurrentUserMock.mockResolvedValue({
        ok: true,
        id: 'user-1',
        username: 'operator',
        role: 'operator',
      })
      screen = await render(<UserAuthForm />)
      usernameInput = screen.getByRole('textbox', {
        name: /^نام کاربری$/,
      })
      passwordInput = screen.getByLabelText(/^رمز عبور$/)
      signInButton = screen.getByRole('button', { name: /^ورود$/ })
    })

    it('renders fields and submit button', async () => {
      await expect.element(usernameInput).toBeInTheDocument()
      await expect.element(passwordInput).toBeInTheDocument()
      await expect.element(signInButton).toBeInTheDocument()
    })

    it('shows validation messages when submitting empty form', async () => {
      await userEvent.click(signInButton)

      await expect
        .element(screen.getByText(FORM_MESSAGES.usernameEmpty))
        .toBeInTheDocument()
      await expect
        .element(screen.getByText(FORM_MESSAGES.passwordEmpty))
        .toBeInTheDocument()
    })

    it('authenticates and navigates to default route on success', async () => {
      await userEvent.fill(usernameInput, 'operator')
      await userEvent.fill(passwordInput, 'secret')

      await userEvent.click(signInButton)

      expect(loginMock).toHaveBeenCalledWith('operator', 'secret')
      await vi.waitFor(() => expect(setUserMock).toHaveBeenCalledOnce())
      expect(setUserMock).toHaveBeenCalledWith(
        { id: 'user-1', username: 'operator', role: 'operator' }
      )

      await vi.waitFor(() =>
        expect(navigate).toHaveBeenCalledWith({ to: '/', replace: true })
      )
    })
  })

  it('navigates to redirectTo when provided', async () => {
    vi.clearAllMocks()
    loginMock.mockResolvedValue({ ok: true })
    getCurrentUserMock.mockResolvedValue({
      ok: true,
      id: 'user-1',
      username: 'operator',
      role: 'operator',
    })

    const { getByRole, getByLabelText } = await render(
      <UserAuthForm redirectTo='/settings' />
    )

    await userEvent.fill(
      getByRole('textbox', { name: /نام کاربری/ }),
      'operator'
    )
    await userEvent.fill(getByLabelText('رمز عبور'), 'secret')

    await userEvent.click(getByRole('button', { name: /ورود/ }))

    await vi.waitFor(() => expect(setUserMock).toHaveBeenCalledOnce())

    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: '/settings',
        replace: true,
      })
    )
  })
})
