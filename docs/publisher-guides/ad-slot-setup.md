# Ad Slot Setup Guide

Complete guide for publishers to create and manage ad slots on their websites.

## Overview

Ad slots are designated spaces on your website where ads will be displayed. Buzzer Network uses industry-standard IAB ad sizes and the X402 protocol for transparent, instant payment.

## Prerequisites

- Verified publisher account
- At least one verified domain
- Basic knowledge of HTML

## Creating an Ad Slot

### 1. Navigate to Ad Slots

From your publisher dashboard:
1. Click "Ad Slots" in the sidebar
2. Click "Create New Slot"

### 2. Configure Basic Settings

**Slot Name**: Give your slot a descriptive name (e.g., "Homepage Top Banner")
- Used for internal organization
- Not visible to users

**Format**: Choose the ad format
- **Banner**: Static or animated display ads (most common)
- **Native**: Ads that match your site's design
- **Video**: Video advertisements

**Position**: Where the slot appears on your page
- **Above the Fold**: Visible without scrolling (premium placement)
- **Below the Fold**: Requires scrolling to view
- **Sidebar**: Side column placements
- **Footer**: Bottom of page

### 3. Select Ad Sizes

Choose one or more IAB standard ad sizes:

**Desktop Sizes**:
- `300x250` - Medium Rectangle (most popular)
- `336x280` - Large Rectangle
- `728x90` - Leaderboard
- `970x250` - Billboard
- `160x600` - Wide Skyscraper
- `300x600` - Half Page

**Mobile Sizes**:
- `320x50` - Mobile Banner
- `320x100` - Large Mobile Banner
- `300x250` - Mobile Rectangle

**Multi-Size Support**:
- Select multiple sizes to increase fill rate
- First selected becomes the "primary size" (space reservation)
- Example combo: `["300x250", "336x280"]` for rectangles

### 4. Advanced Settings

**Lazy Loading** (Recommended):
- Ads load only when scrolled into view
- Improves page performance
- Better user experience

**Ad Refresh** (Optional):
- Automatically refresh ads after specified interval
- Minimum: 30 seconds (policy compliance)
- Maximum: 300 seconds (5 minutes)
- Only refreshes when ad is in viewport

**Floor Price** (Optional):
- Minimum CPM bid you'll accept
- Set in USD (e.g., $2.50)
- Higher floor = higher quality, potentially lower fill rate

## Integration

### Getting the Code

After creating a slot, you'll receive integration code:

```html
<!-- Buzzer Network Ad Slot: Homepage Top Banner -->
<div id="buzzer-ad-bs_abc123_xyz789" 
     data-buzzer-slot="bs_abc123_xyz789"
     style="min-width: 300px; min-height: 250px; display: inline-block;">
  <!-- Ad will load here -->
</div>
<script async 
        src="https://cdn.buzzer.network/x402-ad.js"
        data-publisher-id="pub_abc123"
        data-slot-id="bs_abc123_xyz789"
        data-lazy-load="true"></script>
```

### Installation Steps

1. **Copy the integration code** from the slot creation page
2. **Paste into your HTML** where you want the ad to appear
3. **Verify placement** - ensure there's enough space for your primary size
4. **Test the integration**:
   - Open your page in a browser
   - Check browser console (F12) for errors
   - Verify ad loads correctly

### Best Practices

**Placement**:
- Place above-the-fold for maximum viewability
- Avoid placing too many ads per page (3-5 recommended)
- Don't place ads too close to navigation or buttons

**Layout**:
- Reserve space for your primary size to prevent layout shift
- Use responsive design to adapt on mobile
- Ensure adequate spacing around ads

**Performance**:
- Use lazy loading for below-the-fold ads
- Limit refresh intervals (60-120 seconds ideal)
- Monitor Core Web Vitals impact

## Viewability Standards

We follow IAB/MRC viewability standards:
- **50% of ad pixels visible** for at least **1 continuous second**
- Tracked automatically by our client library
- Only viewable impressions count toward revenue

## Troubleshooting

### Ads Not Showing

**Check Domain Verification**:
- Ensure your domain is verified in dashboard
- Allow 5-10 minutes after verification

**Check Slot Status**:
- Verify slot is set to "Active"
- Check if there are matching campaigns

**Browser Console**:
- Open DevTools (F12) and check Console tab
- Look for errors from `[Buzzer Network]`

**Common Issues**:
- AdBlockers may prevent ads from loading
- Some browsers block third-party content
- Check if creative URL is accessible

### Revenue Not Tracking

**Viewability**:
- Ensure ads are actually visible to users
- Check viewport percentage requirements
- Verify lazy loading is working correctly

**Floor Price**:
- May be set too high, blocking campaigns
- Review and adjust if fill rate is low

**Fraud Detection**:
- Suspicious traffic may be filtered
- Check quality score in dashboard
- Ensure traffic is legitimate

## Performance Optimization

### Page Speed

**Lazy Loading**:
```html
data-lazy-load="true"  <!-- Enable lazy loading -->
```

**Async Loading**:
- Our script loads asynchronously by default
- Won't block page rendering
- Use `async` attribute on script tag

### Fill Rate Optimization

**Multi-Size Slots**:
- Support multiple sizes increases matches
- Recommended: `["300x250", "336x280"]`

**Floor Price**:
- Start without a floor price
- Add floor price once you have data
- Adjust based on average eCPM

**Position**:
- Above-the-fold slots have higher fill rates
- Better visibility = more campaign interest

## Analytics

### Viewing Performance

Navigate to your slot in the dashboard to see:

**Key Metrics**:
- **Impressions**: Total ad views
- **Clicks**: Total ad clicks
- **CTR**: Click-through rate (clicks/impressions)
- **Viewability Rate**: % meeting IAB standard
- **eCPM**: Effective cost per 1000 impressions
- **Revenue**: Total earnings

**Time Ranges**:
- Daily breakdown
- 7-day trends
- 30-day overview

### Optimization Tips

**High Impressions, Low Revenue**:
- Consider adding floor price
- Check viewability rate
- Review slot position

**Low Fill Rate**:
- Remove or lower floor price
- Add more ad sizes
- Check domain verification

**Low Viewability**:
- Move slot above the fold
- Ensure adequate size
- Check lazy loading settings

## Payment

Revenue from your ad slots is automatically:
1. **Calculated daily** at midnight UTC
2. **Aggregated** until minimum payout threshold ($10)
3. **Paid out** to your payment wallet
4. **85% revenue share** (you keep 85%)

View payment history in your dashboard under "Earnings".

## Support

Need help?
- Check our [FAQ](/docs/faq)
- Email: publishers@buzzer.network
- Discord: [Join our community](https://discord.gg/buzzer)

## Advanced Topics

### Custom Implementation

For advanced use cases, you can manually initialize ads:

```javascript
// Manual initialization
const slot = new BuzzerAdSlot(document.getElementById('my-ad-slot'));
slot.init();

// Debug mode
window.BUZZER_DEBUG = true;  // Enable console logging

// Custom API URL (for testing)
window.BUZZER_API_URL = 'http://localhost:3001';
```

### X402 Protocol

Our ad serving uses the X402 payment protocol:
- HTTP 402 "Payment Required" status code
- On-chain payment verification
- Transparent transaction tracking
- Built on BASE network

For developers interested in the protocol, see [X402 Specification](/docs/x402-protocol).

