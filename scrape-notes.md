# grants.supportnow.org - Grant Detail Structure

URL pattern: https://grants.supportnow.org/opportunities/{slug}

Each grant detail page contains:
- Name
- Provided By (organization)
- Types (e.g., Content, Academic Scholarships, Equipment, etc.)
- Last Updated date
- About section (long description)
- Age range (Minimum Age, Maximum Age)
- Verification requirements (Financial, Social Worker, Letter of Medical Necessity)
- Situations (Diagnosis, Military, etc.)
- Locations (USA, International, specific states)
- Impairments (specific or none)
- Award Details (description of what the grant provides)
- Application Details (URL to apply)
- Contact Details (email)

## Strategy for Scraping
The personalized list has ~200 grants across 10 pages. The full database has 3635.
I should use a programmatic approach - use Python with requests/BeautifulSoup to scrape:
1. First get all grant slugs from the paginated list
2. Then visit each grant detail page to extract full info

The cookies from the browser session can be used for authentication.
Let me extract the cookies and write a scraping script.
