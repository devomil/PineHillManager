export default function TestUI() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f0f0f0', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#333', fontSize: '24px', marginBottom: '20px' }}>
        Pine Hill Farm - Test Page
      </h1>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <p style={{ color: '#666', fontSize: '16px', marginBottom: '15px' }}>
          This is a test page to verify the UI is working.
        </p>
        <button 
          style={{
            backgroundColor: '#607e66',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          onClick={() => alert('UI is working!')}
        >
          Test Button
        </button>
      </div>
    </div>
  );
}