import { createRoot } from "react-dom/client";

const rootElement = document.getElementById("root");

if (rootElement) {
  const root = createRoot(rootElement);
  
  // Simple React component without external dependencies
  function PineHillApp() {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#1e293b',
        padding: '2rem'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: '#607e66',
              borderRadius: '20px',
              margin: '0 auto 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '2rem'
            }}>🌲</div>
            <h1 style={{ fontSize: '3rem', fontWeight: '700', marginBottom: '1rem' }}>
              Pine Hill Farm
            </h1>
            <div style={{ fontSize: '1.5rem', color: '#64748b', marginBottom: '2rem' }}>
              Employee Portal
            </div>
            <div style={{
              fontSize: '1.125rem',
              color: '#64748b',
              maxWidth: '600px',
              margin: '0 auto 2rem',
              lineHeight: '1.6'
            }}>
              Welcome to the Pine Hill Farm employee management system. 
              Access your schedule, manage time off, and stay connected with your team.
            </div>
            <a 
              href="/api/login"
              style={{
                background: '#607e66',
                color: 'white',
                padding: '1rem 2rem',
                borderRadius: '8px',
                fontSize: '1.125rem',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-block',
                transition: 'background 0.2s'
              }}
            >
              Sign In to Continue
            </a>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            marginTop: '4rem'
          }}>
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
              textAlign: 'center'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: '#dcfce7',
                color: '#16a34a',
                borderRadius: '8px',
                margin: '0 auto 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem'
              }}>⏰</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                Time Management
              </h3>
              <p style={{ color: '#64748b', lineHeight: '1.6' }}>
                Request time off, view your schedule, and manage shift coverage with ease.
              </p>
            </div>
            
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
              textAlign: 'center'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: '#dbeafe',
                color: '#2563eb',
                borderRadius: '8px',
                margin: '0 auto 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem'
              }}>💬</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                Communication
              </h3>
              <p style={{ color: '#64748b', lineHeight: '1.6' }}>
                Stay updated with company announcements and team communications.
              </p>
            </div>
            
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
              textAlign: 'center'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: '#f1f5f9',
                color: '#64748b',
                borderRadius: '8px',
                margin: '0 auto 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem'
              }}>👥</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                Team Collaboration
              </h3>
              <p style={{ color: '#64748b', lineHeight: '1.6' }}>
                Connect with your colleagues and access training materials.
              </p>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '4rem', color: '#64748b' }}>
            <p>Need help? Contact your supervisor or IT support.</p>
          </div>
        </div>
      </div>
    );
  }
  
  root.render(<PineHillApp />);
}
