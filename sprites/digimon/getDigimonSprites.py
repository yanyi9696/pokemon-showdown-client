import json
import requests

def download_file(id, image):
    local = './raw/' + id + '.jpg'
    url = 'http://www.digimons.net/digimon/' + image + '/' + image + '.jpg'
    with requests.get(url, stream=True) as r:
        r.raise_for_status()
        with open(local, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192): 
                # If you have chunk encoded response uncomment if
                # and set chunk_size parameter to None.
                #if chunk: 
                f.write(chunk)

failed_list = []
with open('./digimon_list.json') as f:
    digimon_list = json.loads(f.read())
    for pair in digimon_list:
        print(pair)
        try:
            download_file(pair[0], pair[1])
        except:
            failed_list.append(pair)
    with open('./failed_list.json', 'w') as ff:
        ff.write(json.dumps(failed_list))
