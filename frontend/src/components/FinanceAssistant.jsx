import { useEffect } from 'react';

/**
 * Finance Assistant Component
 * Integrates ElevenLabs Conversational AI Widget for voice-based finance assistance
 * Supports English and Hindi languages
 */
function FinanceAssistant() {
  useEffect(() => {
    // Check if script is already loaded
    const existingScript = document.querySelector(
      'script[src="https://unpkg.com/@elevenlabs/convai-widget-embed"]'
    );

    if (!existingScript) {
      // Load the ElevenLabs ConvAI widget script
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
      script.async = true;
      script.type = 'text/javascript';
      document.body.appendChild(script);

      return () => {
        // Cleanup script on unmount (optional, usually kept for SPA)
        // document.body.removeChild(script);
      };
    }
  }, []);

  return (
    <elevenlabs-convai agent-id="agent_7601ke24pn4jf2e90g6xc7580r2h"></elevenlabs-convai>
  );
}

export default FinanceAssistant;
