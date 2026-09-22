/**
 * Test: Modern LinkedIn DOM Parsing (2025/2026 Redesign)
 * Verifies that role, company, and location are accurately extracted
 * from the user's provided sample div containing obfuscated classes
 * and prevents feedback question headings from being parsed as roles.
 */

import assert from 'assert';
import { normalizeJobUrl, normalizeCompanyUrl } from '../src/utils/url-normalizer.js';

console.log('--- Test Suite: Modern LinkedIn DOM Parsing ---');

const userSampleHtml = `<div class="_48e06e86 f04e1150 b96f27e6 _44ce800a _8a6ac38f a7439114 a78f11cb f031975b _68b61909 _15a7d761 f6555255" style="display: flex !important; flex-wrap: wrap !important; align-items: center !important; gap: 8px !important;"><div class="_48e06e86 _8a6ac38f a7439114 a78f11cb f031975b _68b61909 e97e94ff f6555255"><div class="_8a6ac38f f5f1e353 _0d1728bd fbf3579a _68b61909 _41c64240 f6555255"><div class="_342f8125 f6555255" data-display-contents="true"><a tabindex="0" class="_3f745e46 _2286817f fb4c6ced _41f6b7d8 a100029c f2db44bc _04ea110f _5279f393 _03f07987 _8a6ac38f" href="https://www.linkedin.com/company/accentureindia/life/" componentkey="auto-binding-c05af43c-dd2a-4bdd-85ab-f9c8db4fca36-4448335206"><div class="e00bbe53 _8a6ac38f f5f1e353 a78f11cb fbf3579a _68b61909 e6e6c754 f6555255" componentkey="auto-binding-c05af43c-dd2a-4bdd-85ab-f9c8db4fca36-4448335206" aria-label="Company, Accenture in India."><figure class="_95a21880 _8ade67cb _3488ab56 d2065f7e _9a839473 a77b1e95 _83a77e19 _72cec60a f6555255"><svg xmlns="http://www.w3.org/2000/svg" id="company-accent-4" aria-hidden="false" viewBox="0 0 128 128" data-token-id="358" class="_5dd88f23 _1fa9cfaf f0c1d351 _2637fcf2 _057bec92" fetchPriority="low" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Company logo for, Accenture in India."><g display="var(--svgDisplayLight)"><path fill="#e7e2dc" d="M0 0h128v128H0z"></path><path fill="#9db3c8" d="M48 16h64v112H48z"></path><path fill="#788fa5" d="M16 80h32v48H16z"></path><path fill="#56687a" d="M48 80h32v48H48z"></path></g><g display="var(--svgDisplayDark)"><path fill="#38434f" d="M0 0h128v128H0z"></path><path fill="#9db3c8" d="M48 16h64v112H48z"></path><path fill="#788fa5" d="M16 80h32v48H16z"></path><path fill="#56687a" d="M48 80h32v48H48z"></path></g></svg><img class="_5dd88f23 _1fa9cfaf f0c1d351 _2637fcf2 _51d0831f _8875ca4d" fetchpriority="low" alt="Company logo for, Accenture in India." src="https://media.licdn.com/dms/image/v2/D4E0BAQHYzTce8ZeOzw/company-logo_100_100/B4EZ6lVj6oIoAI-/0/1780890353567/accentureindia_logo?e=1791417600&amp;v=beta&amp;t=dcZ8xtTufVRgG37rVD3_bHWf0rEzR4V4gpZHnMG41-8" data-loaded="true"></figure><p class="_0b22eed8 a41ffe1a d5b5d861 cec8df53 _398b41b4 _5e283fbe _84bdad2c _46f4ec0a _4455e2d5 c2135853" style="--_2ba00d45: var(--_7b84fa76); --_744688c0: var(--_45000741); --_0010f2e9: var(--bd2ab71c);"><a class="_46f4ec0a _94332408 d2cc8c3e _91861d56" href="https://www.linkedin.com/company/accentureindia/life/">Accenture in India</a></p></div></a></div><button class="_34229610 _183e2942 _04ea110f _1a8237e2 _5279f393 b2884c12 _653015c9 bd0452dc f92fc55b _58a91936 _768357ef fbf3579a _3dee3bee" type="button" aria-label="More options" aria-expanded="false"><span class="_98c1f5a5 c727a7cf e00bbe53 fbf3579a _04ea110f _1a8237e2 _768357ef e97e94ff _77f5aa65 b2884c12 _653015c9 f5d55ab2 cbc9f7b3 d8b5d1fe b19b3b1b _7c64dc72 _72dced66 a4318c1a b379875f d4df6a63 cdfc2151"><svg xmlns="http://www.w3.org/2000/svg" id="overflow-web-ios-medium" fill="currentColor" aria-hidden="true" data-supported-dps="24x24" viewBox="0 0 24 24" data-token-id="376" width="24" height="24" class="_92d43cec _1dc9445e _46354cfe _08bd1221 _3e6ead65 eff7cf30"><path d="M14 12a2 2 0 1 1-2-2 2 2 0 0 1 2 2M4 10a2 2 0 1 0 2 2 2 2 0 0 0-2-2m16 0a2 2 0 1 0 2 2 2 2 0 0 0-2-2"></path></svg></span></button></div><div class="_8a6ac38f f5f1e353 a78f11cb fbf3579a _68b61909 _41c64240 f6555255"><div class="_342f8125 f6555255" data-display-contents="true"><p class="_0b22eed8 b6afce34 d5b5d861 cec8df53 _398b41b4 b2884c12 _84bdad2c _46f4ec0a _4455e2d5 c2135853"><a class="_5279f393 _91861d56" href="https://www.linkedin.com/jobs/view/4448335206/?trackingId=FWQnbxzW0LFpsT8jtmWm6Q%3D%3D&amp;refId=NAUI0kIbFV4uUS7Bw1KkpA%3D%3D&amp;eBP=CwEAAAGgy0fUrgMN9ejAV4Y-FnCQRo1GrUC6A3fJnszpvD7Byi4RxrP4UCDVJoMj7jH8XwZ9txWTmavpiB6WEeOmHyQbNbqheyhiNfackSpMecihvVZcLB_o9uGyLy2C4DF_RA2s720z8kOYK1AgTudHHWLXEQFoFyO7pdzAQdUmkYJQxATyQu4FerxrlM7zCP_vPWMg2CWG_1Pydf3cGLSUj-i6IpCTObvTURPJKShxEQdoRMZAAoUWg5Hw-T-zlPZiFRIxgfCCVIaJFjFmdExYHZnkkcs2jrmxFaaQVfg1ZvvNdrA7sVk0FD-CeSPe3ZNudemsZQHRQRFiy4cn0fQy6QE9DOp_mEOZP23VjG29ToJjLK_uScd6u2UjjhTffzHIMKnZJYtB8vEknad_71dmtX_W51DcAEGg3lHQ8Xqpp6eDmOhmv0V82FZ9igoEfIPdLov5VEx3fnx9aw&amp;alternateChannel=search&amp;isJobSearch=false">Custom Software Engineer</a><span class="_795f7302 f6555255"> </span><a class="_5279f393 _91861d56" href="#"><span class="_97daa3c3 _494d6166 f6555255" role="img" aria-label="Verified job"><svg xmlns="http://www.w3.org/2000/svg" id="verified-medium" fill="currentColor" aria-hidden="true" data-supported-dps="24x24" viewBox="0 0 24 24" data-token-id="133" width="24" height="24" class="_903d5854 _494d6166 _5d90e48d _54450da6" style="width: 24px; min-width: 24px; height: 24px; min-height: 24px;"><path d="m11.99 22-1.23-.44C6.11 19.81 2.99 16 2.99 11V5L12 2l9 3v6c0 5-3.11 8.81-7.74 10.56zM5 6.44V11c0 4.11 2.6 7.35 6.46 8.8l.54.2.58-.2C16.41 18.35 19 15.1 19 11V6.44l-7-2.32zM17 8h-2.57l-4.02 5.01-2.18-2.18-1.41 1.41 3.75 3.75 6.43-8z"></path></svg></span></a></p></div></div><div class="_8a6ac38f f5f1e353 a78f11cb fbf3579a _71b40179 e97e94ff f6555255"></div><p class="_0b22eed8 a41ffe1a d5b5d861 cec8df53 b232eeaf b2884c12 _84bdad2c dbb684da _4455e2d5 c2135853"><span class="dbb684da f6555255">Gurugram, Haryana, India</span><span class="_795f7302 f6555255"> </span>·<span class="_795f7302 f6555255"> </span><span class="dbb684da f6555255">Reposted 3 weeks ago</span><span class="_795f7302 f6555255"> </span>·<span class="_795f7302 f6555255"> </span><span class="dbb684da f6555255">Over 100 people clicked apply</span></p><div class="d5b5d861 cec8df53 b232eeaf b2884c12 _84bdad2c _46f4ec0a _4455e2d5"><p class="_0b22eed8 a41ffe1a c2c57f41 c7b2135e ce6b1bf0 _9a839473 ba3ebb62 ac136c95 c2135853"><span><span class="dbb684da f6555255">Promoted by hirer · </span><span class="dbb684da f6555255">Responses managed off LinkedIn</span></span></p></div></div><div class="_8a6ac38f f5f1e353 a78f11cb f031975b _71b40179 e6e6c754 f6555255"><div class="_02384d06 _7e349f20 f8addc91 f6555255"><a class="_34229610 _183e2942 _04ea110f _1a8237e2 _5279f393 b2884c12 _653015c9 a5c683cb f92fc55b _58a91936 _768357ef fbf3579a _3dee3bee b7dd9c56 _96036b7d" aria-disabled="false" href="https://www.linkedin.com/jobs/search-results/?currentJobId=4448335206"><span class="_98c1f5a5 c727a7cf e00bbe53 fbf3579a _04ea110f _1a8237e2 _768357ef e97e94ff _77f5aa65 b2884c12 _653015c9 f5d55ab2 cbc9f7b3 eba49278 b19b3b1b _494cf372 ec83948d _456c4479 _0f82b7ab"><svg></svg><span class="_0b22eed8 _02c70c1e _148c8084 _398b41b4 _5279f393 _4455e2d5 _16daacfb">On-site</span></span></a></div><div class="_02384d06 _7e349f20 f8addc91 f6555255"><a class="_34229610 _183e2942 _04ea110f _1a8237e2 _5279f393 b2884c12 _653015c9 a5c683cb f92fc55b _58a91936 _768357ef fbf3579a _3dee3bee b7dd9c56 _96036b7d" aria-disabled="false" href="https://www.linkedin.com/jobs/search-results/?currentJobId=4448335206"><span class="_98c1f5a5 c727a7cf e00bbe53 fbf3579a _04ea110f _1a8237e2 _768357ef e97e94ff _77f5aa65 b2884c12 _653015c9 f5d55ab2 cbc9f7b3 eba49278 b19b3b1b _494cf372 ec83948d _456c4479 _0f82b7ab"><svg></svg><span class="_0b22eed8 _02c70c1e _148c8084 _398b41b4 _5279f393 _4455e2d5 _16daacfb">Full-time</span></span></a></div></div><div class="_48e06e86 _8a6ac38f a7439114 a78f11cb f031975b _68b61909 _41c64240 f6555255"><div class="_48e06e86 _8a6ac38f a7439114 a78f11cb f031975b _68b61909 _15a7d761 _2a05c690 f6555255"><div class="_02384d06 ac136c95 _2a05c690 f6555255"><div class="_8a6ac38f f5f1e353 a78f11cb fbf3579a _68b61909 e6e6c754 b7dd9c56 _96036b7d f6555255"><div class="_02384d06 ac136c95 f8addc91 f6555255"><a class="_34229610 _183e2942 _04ea110f _1a8237e2 _5279f393 b2884c12 _653015c9 a5c683cb f92fc55b _58a91936 _768357ef fbf3579a _3dee3bee _2a05c690" aria-disabled="false" href="#" target="_blank"><span class="_98c1f5a5 c727a7cf e00bbe53 fbf3579a _04ea110f _1a8237e2 _768357ef e97e94ff _77f5aa65 b2884c12 _653015c9 f5d55ab2 cbc9f7b3 _9d631e11 ce1c117f _68c5c3ab _426e4e5c _30a01653 _494cf372 ec83948d _456c4479 _7c0e750e"><svg></svg><span class="_0b22eed8 _02c70c1e _148c8084 _398b41b4 _5279f393 _4455e2d5 _16daacfb">Apply</span></span></a></div><div class="_02384d06 ac136c95 f8addc91 f6555255"><button class="_34229610 _183e2942 _04ea110f _1a8237e2 _5279f393 b2884c12 _653015c9 a5c683cb f92fc55b _58a91936 _768357ef fbf3579a _3dee3bee _2a05c690" type="button" aria-label="Save the job"><span class="_98c1f5a5 c727a7cf e00bbe53 fbf3579a _04ea110f _1a8237e2 _768357ef e97e94ff _77f5aa65 b2884c12 _653015c9 f5d55ab2 cbc9f7b3 eba49278 ce1c117f _494cf372 ec83948d _456c4479 _63aacb58"><span class="_0b22eed8 _02c70c1e _148c8084 _398b41b4 _5279f393 _4455e2d5 _16daacfb">Save</span></span></button></div></div></div></div></div><button id="jt-ln-inline-btn" type="button" aria-label="Save job to Google Sheet" class="jt-ln-btn-saved">Saved</button></div>`;

// 1. Role validation check
function isValidRole(text) {
  if (!text || typeof text !== 'string') return false;
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length < 2 || clean.length > 120) return false;
  if (clean.includes('?')) return false;
  if (/^(search|preferences|jobs|feed|messaging|notifications|home|network|manage|details|about the job|overview|filter|alerts)$/i.test(clean)) return false;
  if (/\b(helpful|feedback|results|responses|similar jobs|people you can reach out to|qualifications|insights|learn more|sign in|join now|apply|easy apply|save job|saved)\b/i.test(clean)) return false;
  return true;
}

assert.strictEqual(isValidRole('Are these results helpful?'), false);
assert.strictEqual(isValidRole('Custom Software Engineer'), true);
console.log('✅ [PASS] isValidRole rejects feedback questions and accepts real roles');

// 2. Extract role from HTML
let extractedRole = '';
const pBlocks = userSampleHtml.split('<p').slice(1).map(p => '<p' + p.split('</p>')[0] + '</p>');
for (const p of pBlocks) {
  const match = p.match(/<a[^>]*href="[^"]*\/jobs\/view\/\d+[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
  if (match) {
    const raw = match[1].replace(/<[^>]+>/g, '').trim();
    if (isValidRole(raw)) {
      extractedRole = raw;
      break;
    }
  }
}
assert.strictEqual(extractedRole, 'Custom Software Engineer');
console.log('✅ [PASS] Role correctly extracted:', extractedRole);

// 3. Extract company from HTML
let extractedCompany = '';
let extractedCompanyUrl = '';
const compMatch = userSampleHtml.match(/<a[^>]*href="([^"]*\/company\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
if (compMatch) {
  extractedCompanyUrl = normalizeCompanyUrl(compMatch[1]);
  extractedCompany = compMatch[2].replace(/<[^>]+>/g, '').trim();
}
assert.strictEqual(extractedCompany, 'Accenture in India');
assert.strictEqual(extractedCompanyUrl, 'https://www.linkedin.com/company/accentureindia/');
console.log('✅ [PASS] Company correctly extracted:', extractedCompany, '| URL:', extractedCompanyUrl);

// 4. Extract location from HTML
function isValidLocation(text) {
  if (!text || typeof text !== 'string') return false;
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length < 2 || clean.length > 100) return false;
  if (clean.includes('?')) return false;
  if (/\b(reposted|promoted|responses|managed|easy apply|applicants?|hours?|days?|weeks?|months?|years?|ago|clicked|alumni|school|connections|verified|feedback|helpful|insights|apply)\b/i.test(clean)) {
    return false;
  }
  return true;
}

let extractedLocation = '';
for (const p of pBlocks) {
  const text = p.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.includes('·') || text.includes('•')) {
    const parts = text.split(/[·•]/).map(s => s.trim());
    for (const part of parts) {
      if (isValidLocation(part)) {
        extractedLocation = part;
        break;
      }
    }
    if (extractedLocation) break;
  }
}

let workplace = '';
const wpMatch = userSampleHtml.match(/>(On-site|Hybrid|Remote)<\/span>/i);
if (wpMatch) {
  workplace = wpMatch[1];
}

let finalLocation = extractedLocation;
if (finalLocation && workplace && !finalLocation.toLowerCase().includes(workplace.toLowerCase())) {
  finalLocation = `${finalLocation} (${workplace})`;
}

assert.strictEqual(extractedLocation, 'Gurugram, Haryana, India');
assert.strictEqual(finalLocation, 'Gurugram, Haryana, India (On-site)');
console.log('✅ [PASS] Location correctly extracted:', finalLocation);

console.log('=============================================');
console.log('All Modern LinkedIn parsing tests passed! 🚀');
console.log('=============================================');
