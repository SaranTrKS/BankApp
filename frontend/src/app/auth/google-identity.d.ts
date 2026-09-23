// Minimal ambient types for the Google Identity Services script loaded in index.html.
// Only the pieces this app actually calls are declared.
interface GoogleCredentialResponse {
  credential: string;
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize(config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }): void;
        renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
      };
    };
  };
}
