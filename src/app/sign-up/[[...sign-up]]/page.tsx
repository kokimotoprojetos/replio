import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-dark)' }}>
      <SignUp routing="path" path="/sign-up" appearance={{
        elements: {
          formButtonPrimary: 'btn btn-primary',
          card: 'glass-card'
        }
      }} />
    </div>
  );
}
