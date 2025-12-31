// Workday Authentication & Application Flow Module
// Handles complete Workday job application workflow

const WORKDAY_SELECTORS = {
  // Apply buttons
  apply: [
    'button[data-automation-id="applyButton"]',
    'button[data-automation-id="jobApplyButton"]',
    '[data-automation-id="applyButton"]',
    'button:contains("Apply")',
    'a[data-automation-id="applyButton"]',
    '.css-1i0kjeb', // Common Workday apply button class
    '[aria-label="Apply"]',
    'button.apply-button',
    '[data-uxi-element-id="applyButton"]'
  ],
  
  // Manual Apply (for existing accounts)
  manualApply: [
    'button[data-automation-id="applyManually"]',
    'button:contains("Apply Manually")',
    'a:contains("Apply Manually")',
    '[data-automation-id="manualApply"]',
    'button:contains("Already have an account")',
    '[data-uxi-element-id="applyManually"]'
  ],
  
  // Sign In modal elements
  signInButton: [
    'button[data-automation-id="signInButton"]',
    'button:contains("Sign In")',
    'a:contains("Sign In")',
    '[data-automation-id="signIn"]',
    'button[type="submit"]:contains("Sign In")'
  ],
  
  // Email/Username field
  emailField: [
    'input[data-automation-id="email"]',
    'input[data-automation-id="userName"]',
    'input[name="username"]',
    'input[name="email"]',
    'input[type="email"]',
    'input[aria-label="Email"]',
    'input[aria-label="Username"]',
    '#input-1', // Common Workday ID pattern
    'input[data-automation-id="identityDomainUsername"]'
  ],
  
  // Password field
  passwordField: [
    'input[data-automation-id="password"]',
    'input[name="password"]',
    'input[type="password"]',
    'input[aria-label="Password"]',
    '#input-2'
  ],
  
  // Login submit
  loginSubmit: [
    'button[data-automation-id="signInSubmitButton"]',
    'button[type="submit"]',
    'button:contains("Sign In")',
    'input[type="submit"]',
    '[data-automation-id="click_filter"]'
  ],
  
  // Continue/Next buttons in application flow
  continueButton: [
    'button[data-automation-id="bottom-navigation-next-button"]',
    'button[data-automation-id="nextButton"]',
    'button:contains("Continue")',
    'button:contains("Next")',
    'button:contains("Save and Continue")',
    '[data-automation-id="next"]'
  ],
  
  // Application form detection
  applicationForm: [
    '[data-automation-id="applicationForm"]',
    '[data-automation-id="jobApplicationContainer"]',
    '.application-form',
    '[data-automation-id="questionnairePage"]',
    '[data-automation-id="sourceStep"]'
  ],
  
  // Success indicators
  successIndicators: [
    '[data-automation-id="applicationComplete"]',
    '.application-confirmation',
    ':contains("Application Submitted")',
    ':contains("Thank you for applying")',
    ':contains("application has been received")'
  ],
  
  // Error indicators
  errorIndicators: [
    '[data-automation-id="errorMessage"]',
    '.error-message',
    '[role="alert"]',
    '.validation-error'
  ]
};

class WorkdayFlow {
  constructor() {
    this.credentials = {
      email: 'Maxokafordev@gmail.com',
      password: 'May19315park@',
      autoLogin: true
    };
    this.maxRetries = 3;
    this.stepTimeout = 15000; // 15 seconds per step
  }

  async loadCredentials() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['workday_credentials'], (result) => {
        if (result.workday_credentials) {
          this.credentials = result.workday_credentials;
        }
        resolve(this.credentials);
      });
    });
  }

  async saveCredentials(email, password, autoLogin) {
    this.credentials = { email, password, autoLogin };
    await chrome.storage.local.set({ workday_credentials: this.credentials });
    return true;
  }

  // Execute script in tab context
  async executeInTab(tabId, func, args = []) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func,
        args
      });
      return results?.[0]?.result;
    } catch (e) {
      console.error('[WorkdayFlow] Execute failed:', e);
      return null;
    }
  }

  // Wait for element to appear
  async waitForElement(tabId, selectors, timeout = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const found = await this.executeInTab(tabId, (sels) => {
        for (const sel of sels) {
          try {
            // Handle :contains pseudo-selector
            if (sel.includes(':contains(')) {
              const match = sel.match(/:contains\("([^"]+)"\)/);
              if (match) {
                const baseSelector = sel.split(':contains')[0] || '*';
                const text = match[1];
                const elements = document.querySelectorAll(baseSelector);
                for (const el of elements) {
                  if (el.textContent?.includes(text)) return true;
                }
              }
            } else {
              const el = document.querySelector(sel);
              if (el && el.offsetParent !== null) return true;
            }
          } catch (e) {}
        }
        return false;
      }, [selectors]);

      if (found) return true;
      await this.sleep(500);
    }
    return false;
  }

  // Click element with retries
  async clickElement(tabId, selectors, retries = 3) {
    for (let i = 0; i < retries; i++) {
      const clicked = await this.executeInTab(tabId, (sels) => {
        for (const sel of sels) {
          try {
            if (sel.includes(':contains(')) {
              const match = sel.match(/:contains\("([^"]+)"\)/);
              if (match) {
                const baseSelector = sel.split(':contains')[0] || '*';
                const text = match[1];
                const elements = document.querySelectorAll(baseSelector);
                for (const el of elements) {
                  if (el.textContent?.includes(text)) {
                    el.click();
                    return true;
                  }
                }
              }
            } else {
              const el = document.querySelector(sel);
              if (el && el.offsetParent !== null) {
                el.click();
                return true;
              }
            }
          } catch (e) {}
        }
        return false;
      }, [selectors]);

      if (clicked) return true;
      await this.sleep(1000);
    }
    return false;
  }

  // Fill input field
  async fillField(tabId, selectors, value) {
    return this.executeInTab(tabId, (sels, val) => {
      for (const sel of sels) {
        try {
          const el = document.querySelector(sel);
          if (el && el.offsetParent !== null) {
            el.focus();
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        } catch (e) {}
      }
      return false;
    }, [selectors, value]);
  }

  // Human-like typing
  async typeWithDelay(tabId, selectors, value) {
    return this.executeInTab(tabId, async (sels, val) => {
      for (const sel of sels) {
        try {
          const el = document.querySelector(sel);
          if (el && el.offsetParent !== null) {
            el.focus();
            el.value = '';
            
            for (const char of val) {
              el.value += char;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              await new Promise(r => setTimeout(r, 50 + Math.random() * 50));
            }
            
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        } catch (e) {}
      }
      return false;
    }, [selectors, value]);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // COMPLETE WORKDAY WORKFLOW
  async executeWorkdayFlow(tabId, job, onStep) {
    await this.loadCredentials();
    
    const steps = [
      { name: 'click_apply', action: () => this.stepClickApply(tabId) },
      { name: 'click_manual', action: () => this.stepClickManualApply(tabId) },
      { name: 'fill_login', action: () => this.stepFillCredentials(tabId) },
      { name: 'submit_login', action: () => this.stepSubmitLogin(tabId) },
      { name: 'wait_form', action: () => this.stepWaitForApplicationForm(tabId) },
      { name: 'trigger_tailor', action: () => this.stepTriggerATSTailor(tabId, job) }
    ];

    for (const step of steps) {
      onStep?.(step.name);
      console.log(`[WorkdayFlow] Step: ${step.name}`);
      
      try {
        const result = await step.action();
        if (!result) {
          console.warn(`[WorkdayFlow] Step ${step.name} returned false, continuing...`);
        }
        await this.sleep(1500);
      } catch (error) {
        console.error(`[WorkdayFlow] Step ${step.name} failed:`, error);
        // Continue to next step even on error
      }
    }

    return true;
  }

  // STEP 1: Click Apply button
  async stepClickApply(tabId) {
    console.log('[WorkdayFlow] Step 1: Clicking Apply button...');
    
    // Wait for apply button to appear
    const found = await this.waitForElement(tabId, WORKDAY_SELECTORS.apply, 10000);
    if (!found) {
      console.warn('[WorkdayFlow] Apply button not found');
      return false;
    }

    await this.sleep(500);
    return await this.clickElement(tabId, WORKDAY_SELECTORS.apply);
  }

  // STEP 2: Click "Apply Manually" (for returning users)
  async stepClickManualApply(tabId) {
    console.log('[WorkdayFlow] Step 2: Looking for Apply Manually option...');
    
    // Wait a bit for modal/overlay to appear
    await this.sleep(2000);
    
    const found = await this.waitForElement(tabId, WORKDAY_SELECTORS.manualApply, 5000);
    if (found) {
      return await this.clickElement(tabId, WORKDAY_SELECTORS.manualApply);
    }
    
    // If no manual apply option, might already be on login form
    return true;
  }

  // STEP 3: Fill credentials
  async stepFillCredentials(tabId) {
    console.log('[WorkdayFlow] Step 3: Filling login credentials...');
    
    if (!this.credentials.autoLogin) {
      console.log('[WorkdayFlow] Auto-login disabled, skipping...');
      return true;
    }

    // Wait for login form
    await this.sleep(2000);
    
    const emailFound = await this.waitForElement(tabId, WORKDAY_SELECTORS.emailField, 8000);
    if (!emailFound) {
      console.warn('[WorkdayFlow] Email field not found');
      return false;
    }

    // Fill email
    await this.fillField(tabId, WORKDAY_SELECTORS.emailField, this.credentials.email);
    await this.sleep(500);

    // Fill password
    const passwordFound = await this.waitForElement(tabId, WORKDAY_SELECTORS.passwordField, 3000);
    if (passwordFound) {
      await this.fillField(tabId, WORKDAY_SELECTORS.passwordField, this.credentials.password);
    }

    return true;
  }

  // STEP 4: Submit login
  async stepSubmitLogin(tabId) {
    console.log('[WorkdayFlow] Step 4: Submitting login...');
    
    if (!this.credentials.autoLogin) {
      return true;
    }

    await this.sleep(500);
    
    // Try Sign In button
    const signInFound = await this.waitForElement(tabId, WORKDAY_SELECTORS.signInButton, 3000);
    if (signInFound) {
      await this.clickElement(tabId, WORKDAY_SELECTORS.signInButton);
      await this.sleep(2000);
    }

    // Then try login submit
    const submitFound = await this.waitForElement(tabId, WORKDAY_SELECTORS.loginSubmit, 3000);
    if (submitFound) {
      await this.clickElement(tabId, WORKDAY_SELECTORS.loginSubmit);
    }

    // Wait for page to process
    await this.sleep(3000);
    return true;
  }

  // STEP 5: Wait for application form to load
  async stepWaitForApplicationForm(tabId) {
    console.log('[WorkdayFlow] Step 5: Waiting for application form...');
    
    const found = await this.waitForElement(tabId, WORKDAY_SELECTORS.applicationForm, 15000);
    if (!found) {
      console.warn('[WorkdayFlow] Application form not detected, checking for errors...');
      
      // Check for error messages
      const hasError = await this.executeInTab(tabId, (sels) => {
        for (const sel of sels) {
          try {
            const el = document.querySelector(sel);
            if (el) return el.textContent;
          } catch (e) {}
        }
        return null;
      }, [WORKDAY_SELECTORS.errorIndicators]);

      if (hasError) {
        console.error('[WorkdayFlow] Login error:', hasError);
        return false;
      }
    }

    return true;
  }

  // STEP 6: Trigger ATS Tailor autofill
  async stepTriggerATSTailor(tabId, job) {
    console.log('[WorkdayFlow] Step 6: Triggering ATS Tailor autofill...');
    
    // Send message to content script
    try {
      await chrome.tabs.sendMessage(tabId, {
        action: 'AUTOFILL_CANDIDATE',
        candidate: {
          name: job.candidate_name || '',
          email: job.email || '',
          phone: job.phone || '',
          experience: job.experience_json || []
        },
        platform: 'workday',
        triggerTailor: true
      });
    } catch (e) {
      console.warn('[WorkdayFlow] Content script message failed:', e);
    }

    // Wait for autofill to complete
    await this.sleep(5000);
    return true;
  }

  // Check if URL is Workday
  isWorkdayUrl(url) {
    const urlLower = url.toLowerCase();
    return urlLower.includes('workday.com') || urlLower.includes('myworkdayjobs.com');
  }

  // Get platform type from URL
  detectPlatform(url) {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('workday.com') || urlLower.includes('myworkdayjobs.com')) return 'workday';
    if (urlLower.includes('greenhouse.io')) return 'greenhouse';
    if (urlLower.includes('smartrecruiters.com')) return 'smartrecruiters';
    if (urlLower.includes('icims.com')) return 'icims';
    if (urlLower.includes('workable.com')) return 'workable';
    if (urlLower.includes('teamtailor.com')) return 'teamtailor';
    if (urlLower.includes('bullhorn')) return 'bullhorn';
    if (urlLower.includes('oracle') || urlLower.includes('taleo')) return 'oracle';
    
    return 'unknown';
  }
}

// Export for use in bulk-apply.js
window.WorkdayFlow = WorkdayFlow;
window.WORKDAY_SELECTORS = WORKDAY_SELECTORS;