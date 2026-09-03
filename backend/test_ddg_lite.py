import urllib.request
import urllib.parse
import re

def search_ddg_lite(query: str):
    try:
        url = "https://lite.duckduckgo.com/lite/"
        data = urllib.parse.urlencode({'q': query}).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        })
        html = urllib.request.urlopen(req).read().decode('utf-8')
        
        # In lite.duckduckgo.com, snippets are typically in <td class='result-snippet'>
        snippets = re.findall(r'<td class=\'result-snippet\'[^>]*>(.*?)</td>', html, flags=re.IGNORECASE|re.DOTALL)
        
        clean = []
        for s in snippets:
            text = re.sub(r'<[^>]+>', '', s).strip()
            if text:
                clean.append(text)
        return clean[:3]
    except Exception as e:
        print(f"Error: {e}")
        return []

if __name__ == "__main__":
    print(search_ddg_lite("latest OpenAI model released"))
