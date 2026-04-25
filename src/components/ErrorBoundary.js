import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="content-container">
          <div className="error-message" style={{ padding: '40px', textAlign: 'center' }}>
            <h2>Something went wrong</h2>
            <p>An error occurred while loading this page.</p>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '20px' }}>
              {this.state.error?.message || 'Unknown error'}
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              style={{ marginTop: '20px' }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;









