/**
 * Buzzer Network X402 Ad Client Library
 * Handles ad request, rendering, viewability tracking, and X402 payment protocol
 */

(function () {
  'use strict';

  const API_URL = window.BUZZER_API_URL || 'http://localhost:3001';
  const DEBUG = window.BUZZER_DEBUG || false;

  /**
   * Utility: Log debug messages
   */
  function log(...args) {
    if (DEBUG) {
      console.log('[Buzzer Network]', ...args);
    }
  }

  /**
   * Utility: Get client IP (approximate, from headers if available)
   */
  function getClientInfo() {
    return {
      device: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      geo: null, // Server-side detection
    };
  }

  /**
   * BuzzerAdSlot Class
   * Manages a single ad slot lifecycle
   */
  class BuzzerAdSlot {
    constructor(element) {
      this.element = element;
      this.slotId = element.dataset.buzzerSlot;
      this.publisherId = element.dataset.publisherId || 
                         document.querySelector('script[data-publisher-id]')?.dataset.publisherId;
      this.refreshEnabled = element.dataset.refreshEnabled === 'true';
      this.refreshInterval = parseInt(element.dataset.refreshInterval || '30') * 1000;
      this.lazyLoad = element.dataset.lazyLoad === 'true';
      
      this.adData = null;
      this.viewabilityObserver = null;
      this.viewableStartTime = null;
      this.loadTime = Date.now();
      this.refreshTimer = null;
      this.hasTrackedImpression = false;
      this.isInViewport = false;
      
      log('Initialized slot:', this.slotId);
    }

    /**
     * Initialize the ad slot
     */
    async init() {
      if (!this.publisherId || !this.slotId) {
        console.error('[Buzzer Network] Missing required data: publisherId or slotId');
        return;
      }

      // Setup intersection observer for lazy loading and viewability
      if (this.lazyLoad) {
        this.setupLazyLoad();
      } else {
        await this.loadAd();
      }
    }

    /**
     * Setup lazy loading with Intersection Observer
     */
    setupLazyLoad() {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.adData) {
            log('Slot entered viewport, loading ad:', this.slotId);
            this.loadAd();
            observer.disconnect();
          }
        });
      }, { threshold: 0.01 });
      
      observer.observe(this.element);
    }

    /**
     * Load and request ad from X402 endpoint
     */
    async loadAd() {
      try {
        await this.requestAd();
        if (this.adData) {
          this.renderAd();
          this.setupViewabilityTracking();
          this.setupClickTracking();
          
          // Setup refresh if enabled
          if (this.refreshEnabled) {
            this.setupAdRefresh();
          }
        } else {
          this.renderFallback();
        }
      } catch (error) {
        console.error('[Buzzer Network] Error loading ad:', error);
        this.renderFallback();
      }
    }

    /**
     * Request ad from X402 endpoint
     */
    async requestAd() {
      const clientInfo = getClientInfo();
      const url = `${API_URL}/x402/ad?pub_id=${this.publisherId}&slot_id=${this.slotId}&format=banner&device=${clientInfo.device}`;
      
      log('Requesting ad:', url);
      
      try {
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (response.status === 402) {
          // Handle X402 Payment Required
          const paymentData = await response.json();
          log('Payment required:', paymentData);
          await this.handlePaymentRequired(paymentData);
          // Retry request after payment
          return this.requestAd();
        }
        
        if (response.status === 404) {
          log('No matching campaigns available');
          return;
        }
        
        if (response.ok) {
          this.adData = await response.json();
          log('Ad received:', this.adData);
        } else {
          throw new Error(`Ad request failed: ${response.status}`);
        }
      } catch (error) {
        console.error('[Buzzer Network] Ad request failed:', error);
        throw error;
      }
    }

    /**
     * Handle X402 Payment Required (402 status)
     */
    async handlePaymentRequired(paymentData) {
      log('Handling X402 payment requirement');
      
      // Check if wallet is available (MetaMask, Coinbase Wallet, etc.)
      if (typeof window.ethereum === 'undefined') {
        console.warn('[Buzzer Network] No Web3 wallet detected. Payment required but cannot proceed.');
        return;
      }
      
      try {
        // Request account access
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        
        if (!accounts || accounts.length === 0) {
          console.warn('[Buzzer Network] No wallet accounts available');
          return;
        }
        
        // Convert amount to wei (if in ETH)
        const amountWei = '0x' + Math.floor(parseFloat(paymentData.amount) * 1e18).toString(16);
        
        // Send payment transaction
        const txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [{
            from: accounts[0],
            to: paymentData.payment_address,
            value: amountWei,
          }],
        });
        
        log('Payment transaction sent:', txHash);
        this.paymentTxHash = txHash;
        
        // Wait for confirmation (optional, but recommended)
        // In production, you might want to wait for 1-2 confirmations
        await this.waitForTransaction(txHash);
        
      } catch (error) {
        console.error('[Buzzer Network] Payment failed:', error);
        throw error;
      }
    }

    /**
     * Wait for transaction confirmation
     */
    async waitForTransaction(txHash) {
      return new Promise((resolve) => {
        // Simple polling for transaction receipt
        const checkReceipt = async () => {
          try {
            const receipt = await window.ethereum.request({
              method: 'eth_getTransactionReceipt',
              params: [txHash],
            });
            
            if (receipt && receipt.status === '0x1') {
              log('Payment confirmed:', txHash);
              resolve(receipt);
            } else if (receipt && receipt.status === '0x0') {
              console.error('[Buzzer Network] Payment transaction failed');
              resolve(null);
            } else {
              // Still pending, check again
              setTimeout(checkReceipt, 2000);
            }
          } catch (error) {
            console.error('[Buzzer Network] Error checking transaction:', error);
            resolve(null);
          }
        };
        
        checkReceipt();
      });
    }

    /**
     * Render ad creative
     */
    renderAd() {
      if (!this.adData) return;
      
      log('Rendering ad:', this.adData.ad_id);
      
      // Clear existing content
      this.element.innerHTML = '';
      
      // Create iframe for ad creative
      const iframe = document.createElement('iframe');
      iframe.src = this.adData.creative_url;
      iframe.width = this.adData.width;
      iframe.height = this.adData.height;
      iframe.frameBorder = '0';
      iframe.scrolling = 'no';
      iframe.style.border = 'none';
      iframe.style.display = 'block';
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
      
      // Make container clickable
      this.element.style.cursor = 'pointer';
      this.element.appendChild(iframe);
      
      // Track impression when rendered and viewable
      // We'll track via viewability observer for more accurate counting
    }

    /**
     * Render fallback content (no ad available)
     */
    renderFallback() {
      this.element.innerHTML = '';
      this.element.style.backgroundColor = '#f5f5f5';
      this.element.style.display = 'flex';
      this.element.style.alignItems = 'center';
      this.element.style.justifyContent = 'center';
      this.element.style.color = '#999';
      this.element.style.fontSize = '12px';
      this.element.textContent = 'Advertisement';
    }

    /**
     * Setup viewability tracking with Intersection Observer
     * IAB/MRC standard: 50% visible for 1+ continuous second
     */
    setupViewabilityTracking() {
      if (!this.adData) return;
      
      this.viewabilityObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const visiblePercentage = Math.round(entry.intersectionRatio * 100);
          
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Ad is 50%+ visible
            if (!this.viewableStartTime) {
              this.viewableStartTime = Date.now();
              log('Ad became viewable:', this.adData.ad_id);
              
              // Track impression when ad becomes viewable
              if (!this.hasTrackedImpression) {
                this.trackImpression();
                this.hasTrackedImpression = true;
              }
            }
            
            this.isInViewport = true;
          } else {
            // Ad is not viewable
            if (this.viewableStartTime) {
              const viewableTime = Date.now() - this.viewableStartTime;
              const totalTime = Date.now() - this.loadTime;
              
              log('Ad no longer viewable. Duration:', viewableTime, 'ms');
              
              this.trackViewability(viewableTime, totalTime, visiblePercentage);
              this.viewableStartTime = null;
            }
            
            this.isInViewport = false;
          }
        });
      }, { 
        threshold: [0, 0.25, 0.5, 0.75, 1.0]  // Multiple thresholds for accurate tracking
      });
      
      this.viewabilityObserver.observe(this.element);
      
      // Also track viewability when page is about to unload
      window.addEventListener('beforeunload', () => {
        if (this.viewableStartTime) {
          const viewableTime = Date.now() - this.viewableStartTime;
          const totalTime = Date.now() - this.loadTime;
          this.trackViewability(viewableTime, totalTime, 50);
        }
      });
    }

    /**
     * Setup click tracking
     */
    setupClickTracking() {
      if (!this.adData) return;
      
      this.element.addEventListener('click', (e) => {
        e.preventDefault();
        log('Ad clicked:', this.adData.ad_id);
        
        // Open landing page in new tab
        window.open(this.adData.click_url, '_blank', 'noopener,noreferrer');
      });
    }

    /**
     * Track impression event
     */
    async trackImpression() {
      if (!this.adData || this.hasTrackedImpression) return;
      
      log('Tracking impression:', this.adData.ad_id);
      
      try {
        await fetch(this.adData.impression_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            campaign_id: this.adData.campaign_id,
            publisher_id: this.publisherId,
            slot_id: this.slotId,
            geo: null,
            device: getClientInfo().device,
          }),
        });
        
        log('Impression tracked successfully');
      } catch (error) {
        console.error('[Buzzer Network] Error tracking impression:', error);
      }
    }

    /**
     * Track viewability metrics
     */
    async trackViewability(viewableTime, totalTime, viewportPercentage) {
      if (!this.adData) return;
      
      log('Tracking viewability:', {
        viewableTime,
        totalTime,
        viewportPercentage,
        met: viewableTime >= 1000 && viewportPercentage >= 50,
      });
      
      try {
        await fetch(`${API_URL}/track/viewability/${this.adData.ad_id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            slot_id: this.slotId,
            viewable_time: viewableTime,
            total_time: totalTime,
            viewport_percentage: viewportPercentage,
          }),
        });
        
        log('Viewability tracked successfully');
      } catch (error) {
        console.error('[Buzzer Network] Error tracking viewability:', error);
      }
    }

    /**
     * Setup ad refresh (if enabled)
     */
    setupAdRefresh() {
      if (!this.refreshEnabled || !this.refreshInterval) return;
      
      log('Setting up ad refresh:', this.refreshInterval, 'ms');
      
      // Only refresh when ad is in viewport
      const scheduleRefresh = () => {
        this.refreshTimer = setTimeout(() => {
          if (this.isInViewport) {
            log('Refreshing ad:', this.slotId);
            this.refreshAd();
          } else {
            log('Ad not in viewport, skipping refresh');
            scheduleRefresh(); // Reschedule
          }
        }, this.refreshInterval);
      };
      
      scheduleRefresh();
    }

    /**
     * Refresh ad (reload with new creative)
     */
    async refreshAd() {
      // Track final viewability before refresh
      if (this.viewableStartTime) {
        const viewableTime = Date.now() - this.viewableStartTime;
        const totalTime = Date.now() - this.loadTime;
        await this.trackViewability(viewableTime, totalTime, 50);
        this.viewableStartTime = null;
      }
      
      // Disconnect viewability observer
      if (this.viewabilityObserver) {
        this.viewabilityObserver.disconnect();
      }
      
      // Reset state
      this.hasTrackedImpression = false;
      this.loadTime = Date.now();
      this.adData = null;
      
      // Load new ad
      await this.loadAd();
    }

    /**
     * Destroy slot (cleanup)
     */
    destroy() {
      if (this.viewabilityObserver) {
        this.viewabilityObserver.disconnect();
      }
      
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
      }
      
      log('Slot destroyed:', this.slotId);
    }
  }

  /**
   * Auto-initialize all ad slots on page load
   */
  function initializeAdSlots() {
    log('Initializing Buzzer Network ad slots...');
    
    const slots = document.querySelectorAll('[data-buzzer-slot]');
    log('Found', slots.length, 'ad slots');
    
    const instances = [];
    
    slots.forEach(element => {
      try {
        const slot = new BuzzerAdSlot(element);
        slot.init();
        instances.push(slot);
      } catch (error) {
        console.error('[Buzzer Network] Error initializing slot:', error);
      }
    });
    
    // Store instances globally for debugging
    window.BuzzerAdSlots = instances;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdSlots);
  } else {
    initializeAdSlots();
  }

  // Export for manual initialization if needed
  window.BuzzerAdSlot = BuzzerAdSlot;
  window.initializeBuzzerAds = initializeAdSlots;
  
  log('Buzzer Network X402 client library loaded');
})();

