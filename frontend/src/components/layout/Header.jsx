import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { Github } from 'lucide-react';

const Header = () => {
    return (
        <header className='header flex justify-between items-center px-4 sm:px-10 md:px-20 py-2 bg-background'>
            <div className="flex items-center gap-2">
              <Github className="h-6 w-6" />
              <span className="font-bold text-lg">Block Party</span>
            </div>
            <div className="auth">
                <SignedOut>
                    <SignInButton />
                </SignedOut>
                <SignedIn>
                    <UserButton className='w-10 h-10'/>
                </SignedIn>
            </div>
        </header>
    )
}

export default Header
