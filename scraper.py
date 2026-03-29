#!/usr/bin/env python3
"""
Scraper for grants.supportnow.org
Collects grant URLs from paginated list, then scrapes individual grant details.
"""
import requests
from bs4 import BeautifulSoup
import json
import time
import re
import sys

BASE_URL = "https://grants.supportnow.org"

# Session with cookies from browser
session = requests.Session()

def get_session_cookie():
    """Read cookies from browser cookie file"""
    # We'll set cookies manually from the browser session
    pass

def get_grant_slugs_from_page(url, cookies):
    """Extract all grant opportunity slugs from a list page"""
    resp = session.get(url, cookies=cookies, headers={
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    })
    soup = BeautifulSoup(resp.text, 'html.parser')
    
    slugs = set()
    for a in soup.find_all('a', href=True):
        href = a['href']
        if '/opportunities/' in href:
            slug = href.split('/opportunities/')[-1]
            if slug and '#' not in slug:
                slugs.add(slug)
    
    # Find pagination links
    next_page = None
    for a in soup.find_all('a', rel='next'):
        next_page = a['href']
        if not next_page.startswith('http'):
            next_page = BASE_URL + next_page
        break
    
    # Also check for "Next" text link
    if not next_page:
        for a in soup.find_all('a'):
            if a.text.strip() in ['Next ›', 'Next', '›']:
                href = a.get('href', '')
                if href:
                    if not href.startswith('http'):
                        next_page = BASE_URL + href
                    else:
                        next_page = href
                break
    
    return slugs, next_page

def scrape_grant_detail(slug, cookies):
    """Scrape detailed info from a single grant page"""
    url = f"{BASE_URL}/opportunities/{slug}"
    resp = session.get(url, cookies=cookies, headers={
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    })
    
    if resp.status_code != 200:
        print(f"  ERROR: Status {resp.status_code} for {slug}")
        return None
    
    soup = BeautifulSoup(resp.text, 'html.parser')
    
    grant = {
        'slug': slug,
        'url': url,
        'name': '',
        'organization': '',
        'types': [],
        'lastUpdated': '',
        'description': '',
        'minAge': None,
        'maxAge': None,
        'financialVerification': '',
        'socialWorkerVerification': '',
        'letterOfMedicalNecessity': '',
        'situations': [],
        'locations': [],
        'impairments': [],
        'awardDescription': '',
        'applicationUrl': '',
        'contactEmail': '',
    }
    
    # Get the title from h1 or the header
    h1 = soup.find('h1')
    if h1:
        grant['name'] = h1.text.strip()
    
    # Parse the page text for structured data
    text = soup.get_text('\n', strip=True)
    
    # Name field
    name_match = re.search(r'Name\n(.+?)(?:\n|$)', text)
    if name_match:
        grant['name'] = name_match.group(1).strip()
    
    # Provided By
    prov_match = re.search(r'Provided By\n(.+?)(?:\n|$)', text)
    if prov_match:
        grant['organization'] = prov_match.group(1).strip()
    
    # Types
    types_match = re.search(r'Types\n(.+?)(?:\n|$)', text)
    if types_match:
        grant['types'] = [t.strip() for t in types_match.group(1).split(',')]
    
    # Last Updated
    updated_match = re.search(r'Last Updated\n(.+?)(?:\n|$)', text)
    if updated_match:
        grant['lastUpdated'] = updated_match.group(1).strip()
    
    # About section - get the main description
    about_header = soup.find('h2', string=re.compile(r'About'))
    if about_header:
        desc_parts = []
        for sibling in about_header.find_next_siblings():
            if sibling.name == 'h2':
                break
            t = sibling.get_text(strip=True)
            if t:
                desc_parts.append(t)
        grant['description'] = ' '.join(desc_parts)
    
    # Age range
    min_age = re.search(r'Minimum Age:\s*(\d+)', text)
    max_age = re.search(r'Maximum Age:\s*(\d+)', text)
    if min_age:
        grant['minAge'] = int(min_age.group(1))
    if max_age:
        grant['maxAge'] = int(max_age.group(1))
    
    # Verification
    fin_ver = re.search(r'Financial Verification:\s*(.+?)(?:\n|$)', text)
    if fin_ver:
        grant['financialVerification'] = fin_ver.group(1).strip()
    
    sw_ver = re.search(r'Social Worker Verification:\s*(.+?)(?:\n|$)', text)
    if sw_ver:
        grant['socialWorkerVerification'] = sw_ver.group(1).strip()
    
    lmn = re.search(r'Letter of Medical Necessity:\s*(.+?)(?:\n|$)', text)
    if lmn:
        grant['letterOfMedicalNecessity'] = lmn.group(1).strip()
    
    # Situations
    sit_header = soup.find('h2', string=re.compile(r'Situations'))
    if sit_header:
        sit_list = sit_header.find_next('ul')
        if sit_list:
            grant['situations'] = [li.text.strip() for li in sit_list.find_all('li')]
    
    # Locations
    loc_header = soup.find('h2', string=re.compile(r'Locations'))
    if loc_header:
        loc_list = loc_header.find_next('ul')
        if loc_list:
            grant['locations'] = [li.text.strip() for li in loc_list.find_all('li')]
    
    # Impairments
    imp_header = soup.find('h2', string=re.compile(r'Impairments'))
    if imp_header:
        imp_list = imp_header.find_next('ul')
        if imp_list:
            grant['impairments'] = [li.text.strip() for li in imp_list.find_all('li')]
    
    # Award Details
    award_header = soup.find('h2', string=re.compile(r'Award'))
    if award_header:
        desc_el = award_header.find_next(string=re.compile(r'Description'))
        if desc_el:
            parent = desc_el.find_parent()
            if parent:
                next_text = parent.find_next_sibling()
                if next_text:
                    grant['awardDescription'] = next_text.get_text(strip=True)
    
    # Application URL
    app_header = soup.find('h2', string=re.compile(r'Application'))
    if app_header:
        app_link = app_header.find_next('a', href=True)
        if app_link and not app_link['href'].startswith('mailto:'):
            grant['applicationUrl'] = app_link['href']
    
    # Contact Email
    email_link = soup.find('a', href=re.compile(r'^mailto:'))
    if email_link:
        grant['contactEmail'] = email_link['href'].replace('mailto:', '')
    
    return grant

def main():
    # Get cookies from command line or use defaults
    cookie_str = sys.argv[1] if len(sys.argv) > 1 else ""
    cookies = {}
    if cookie_str:
        for pair in cookie_str.split('; '):
            if '=' in pair:
                k, v = pair.split('=', 1)
                cookies[k] = v
    
    print("=== Step 1: Collecting grant slugs from all pages ===")
    
    all_slugs = set()
    # Start from the personalized grants list
    list_url = sys.argv[2] if len(sys.argv) > 2 else f"{BASE_URL}/grants"
    
    page_num = 1
    current_url = list_url
    
    while current_url and page_num <= 15:  # Safety limit
        print(f"  Page {page_num}: {current_url}")
        slugs, next_page = get_grant_slugs_from_page(current_url, cookies)
        print(f"    Found {len(slugs)} grants")
        all_slugs.update(slugs)
        current_url = next_page
        page_num += 1
        time.sleep(0.5)
    
    print(f"\n  Total unique grant slugs: {len(all_slugs)}")
    
    # Save slugs
    with open('/home/ubuntu/grantkit/grant_slugs.json', 'w') as f:
        json.dump(sorted(list(all_slugs)), f, indent=2)
    print("  Saved slugs to grant_slugs.json")
    
    print("\n=== Step 2: Scraping individual grant details ===")
    
    grants = []
    slug_list = sorted(list(all_slugs))
    
    for i, slug in enumerate(slug_list):
        print(f"  [{i+1}/{len(slug_list)}] Scraping: {slug}")
        grant = scrape_grant_detail(slug, cookies)
        if grant:
            grants.append(grant)
        time.sleep(0.3)  # Be respectful
        
        # Save progress every 50 grants
        if (i + 1) % 50 == 0:
            with open('/home/ubuntu/grantkit/scraped_grants_progress.json', 'w') as f:
                json.dump(grants, f, indent=2, ensure_ascii=False)
            print(f"    Progress saved: {len(grants)} grants")
    
    # Final save
    with open('/home/ubuntu/grantkit/scraped_grants.json', 'w') as f:
        json.dump(grants, f, indent=2, ensure_ascii=False)
    
    print(f"\n=== Done! Scraped {len(grants)} grants ===")
    print(f"  Saved to scraped_grants.json")

if __name__ == '__main__':
    main()
