export function initWalkthrough() {
  const hasSeen = localStorage.getItem('progressos_walkthrough_complete');
  if (hasSeen === 'true') return;
  
  if (document.getElementById('walkthrough-overlay')) return;

  const steps = [
    {
      targetView: 'today', // Using the router's view string
      title: 'Step 1: Track Your Routine',
      content: 'Track your morning and evening routines in one place. ProgressOS turns daily check-ins into a clear record of your consistency.'
    },
    {
      targetView: 'progress',
      title: 'Step 2: Document Your Journey',
      content: 'Document your journey with dated photographs and personal notes. Keep your experience organised instead of relying on scattered camera-roll images.'
    },
    {
      targetView: 'insights',
      title: 'Step 3: Understand and Recover',
      content: 'Understand your consistency over time, recognise interruptions and review how you resumed your routine.'
    }
  ];
  
  let currentStep = 0;
  let activeTargetNode = null;
  
  const overlay = document.createElement('div');
  overlay.id = 'walkthrough-overlay';
  overlay.className = 'tour-overlay';
  
  const dialog = document.createElement('div');
  dialog.className = 'tour-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  
  const clearHighlight = () => {
      if (activeTargetNode) {
          activeTargetNode.classList.remove('tour-active-target');
          activeTargetNode = null;
      }
  };
  
  const applyHighlight = (viewName) => {
      clearHighlight();
      
      // Simulate navigation click to ensure the correct screen is loaded
      const navButtons = document.querySelectorAll('.nav-item');
      let targetButton = null;
      
      navButtons.forEach(btn => {
          // Identify button by looking at its onclick/dataset or guessing based on inner text
          const text = btn.innerText.toLowerCase();
          if (viewName === 'today' && text.includes('overview')) targetButton = btn;
          if (viewName === 'progress' && text.includes('journey')) targetButton = btn;
          if (viewName === 'insights' && (text.includes('insights') || text.includes('reports'))) targetButton = btn;
      });
      
      if (targetButton) {
          targetButton.click(); // Trigger router
          targetButton.classList.add('tour-active-target');
          activeTargetNode = targetButton;
      }
  };
  
  const renderStep = () => {
    const step = steps[currentStep];
    
    // Mount the screen and highlight the nav element
    applyHighlight(step.targetView);
    
    dialog.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:20px; align-items: center;">
        <span style="font-size:0.75rem; font-weight:700; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.05em;">Step ${currentStep + 1} of ${steps.length}</span>
        <button id="wt-skip" style="background:none; border:none; color:#9CA3AF; font-size:0.85rem; font-weight:600; cursor:pointer; padding: 4px;">Skip</button>
      </div>
      <h3 style="margin:0 0 12px 0; color:#265289; font-size:1.4rem; font-family: 'DM Serif Display', serif;">${step.title}</h3>
      <p style="margin:0 0 32px 0; color:#4B5563; font-size:0.95rem; line-height:1.6;">${step.content}</p>
      
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <button id="wt-back" tabindex="0" style="background:none; border:none; color:#4B5563; font-weight:600; cursor:pointer; padding:8px 12px; margin-left:-12px; opacity:${currentStep === 0 ? '0' : '1'}; pointer-events:${currentStep === 0 ? 'none' : 'auto'};">Back</button>
        <button id="wt-next" tabindex="0" style="background:#265289; color:white; border:none; padding:12px 24px; border-radius:6px; font-weight:600; font-size: 0.95rem; cursor:pointer; box-shadow: 0 4px 12px rgba(38,82,137,0.2);">${currentStep === steps.length - 1 ? 'Finish' : 'Next'}</button>
      </div>
    `;
    
    document.getElementById('wt-skip').addEventListener('click', endWalkthrough);
    document.getElementById('wt-back').addEventListener('click', () => { currentStep--; renderStep(); });
    
    const nextBtn = document.getElementById('wt-next');
    nextBtn.addEventListener('click', () => {
      if (currentStep === steps.length - 1) {
        endWalkthrough();
      } else {
        currentStep++;
        renderStep();
      }
    });
    
    // Focus management
    nextBtn.focus();
  };
  
  const endWalkthrough = () => {
    clearHighlight();
    localStorage.setItem('progressos_walkthrough_complete', 'true');
    if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
    }
  };
  
  // Accessibility: Escape to close
  const handleKeydown = (e) => {
      if (e.key === 'Escape') {
          endWalkthrough();
          document.removeEventListener('keydown', handleKeydown);
      }
  };
  document.addEventListener('keydown', handleKeydown);
  
  renderStep();
}