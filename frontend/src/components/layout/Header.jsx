import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';

const Header = () => {
    return (
        <header className='header flex justify-between items-center px-4 sm:px-10 md:px-20'>
            <div className="title">BlockParty</div>
            <div className="auth">
                <SignedOut>
                    <SignInButton />
                </SignedOut>
                <SignedIn>
                    <UserButton />
                </SignedIn>
            </div>
        </header>
    )
}

export default Header
