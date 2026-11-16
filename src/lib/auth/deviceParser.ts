export interface ParsedDeviceInfo {
  deviceName: string;
  browser: string;
  os: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
}

export function parseUserAgent(userAgentString?: string | null): ParsedDeviceInfo {
  const ua = userAgentString || '';

  // Determine OS (check mobile devices first because iOS user agents include "like Mac OS X")
  let os = 'Unknown OS';
  if (/iPad/i.test(ua)) {
    os = 'iPadOS';
  } else if (/iPhone|iPod/i.test(ua)) {
    os = 'iOS';
  } else if (/Android/i.test(ua)) {
    os = 'Android';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macOS';
  } else if (/Windows/i.test(ua)) {
    os = 'Windows';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
  } else if (/CrOS/i.test(ua)) {
    os = 'ChromeOS';
  }

  // Determine Browser
  let browser = 'Web Browser';
  if (/Edg|Edge/i.test(ua)) {
    browser = 'Edge';
  } else if (/OPR|Opera/i.test(ua)) {
    browser = 'Opera';
  } else if (/Chrome|CriOS/i.test(ua) && !/Edg|OPR/i.test(ua)) {
    browser = 'Chrome';
  } else if (/Firefox|FxiOS/i.test(ua)) {
    browser = 'Firefox';
  } else if (/Safari/i.test(ua) && !/Chrome|CriOS|Android/i.test(ua)) {
    browser = 'Safari';
  }

  // Determine Device Type
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  if (/iPad|tablet|PlayBook/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    deviceType = 'tablet';
  } else if (/Mobile|iPhone|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    deviceType = 'mobile';
  }

  // Friendly Device Name
  let deviceName = `${os} · ${browser}`;
  if (os === 'iOS') {
    deviceName = `iPhone · ${browser}`;
  } else if (os === 'iPadOS') {
    deviceName = `iPad · ${browser}`;
  } else if (os === 'macOS') {
    deviceName = `Mac · ${browser}`;
  } else if (os === 'Windows') {
    deviceName = `Windows PC · ${browser}`;
  } else if (os === 'Android') {
    deviceName = deviceType === 'tablet' ? `Android Tablet · ${browser}` : `Android · ${browser}`;
  } else if (os === 'Linux') {
    deviceName = `Linux PC · ${browser}`;
  }

  return {
    deviceName,
    browser,
    os,
    deviceType,
  };
}
