# originated from https://github.com/Aegide/autogen-fusion-sprites

from selenium.webdriver import Firefox as firefox
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.common.proxy import Proxy, ProxyType
# 1. pip install selenium
# 2. don't use `sudo apt-get install firefox` cuz that has Marionette port issues
# 2.5. manually install firefox and download geckodriver instead
import subprocess
import time
import sys
import os

fusion_url = "https://japeal.com/pkm/"
driver_delay = 5
basic_delay = 1

is_loud = True

download_path = "/home/mc/pokemon-showdown-client/sprites/cache"

id_head_pokemon = "Rimagediv"
id_body_pokemon = "Limagediv"
id_textbox = "msdropdown20_titleText"
id_fusion = "fbutton"
id_download = "downloadBtn"
class_textbox = "searchbar1"
class_selected = "selected"

proxy_address = "127.0.0.1:7890"
screenshot_path = "/home/mc/pokemon-showdown-client/sprites/cache/test.png" # for debug use

def log(message:str):
    if is_loud:
        print(f"> {message}")

def get_driver():
    options = Options()
    options.set_preference('browser.download.folderList', 2)
    options.set_preference('browser.download.dir', download_path)
    options.add_argument('-headless')
    options.add_argument('window-size=1920,1080')
    # we have to use proxy otherwise the page won't be fully loaded
    proxy = Proxy({
        'proxyType': ProxyType.MANUAL,
        'httpProxy': proxy_address,
        'sslProxy': proxy_address,
        'noProxy': ''
    })
    options.proxy = proxy
    service = Service(executable_path='/home/mc/Firefox/geckodriver')# , port=4337)
    return firefox(service=service, options=options)

def get_element_by_id(driver:WebDriver, id_element:str) -> WebElement:
    element = None
    locator = (By.ID, id_element)
    try:
        element = WebDriverWait(driver, driver_delay).until(EC.presence_of_element_located(locator))
    except TimeoutException:
        print(f"[get_element_by_id] Failed to get {id_element}")
        sys.exit(1)
    return element

def get_element_by_class(driver:WebDriver, class_element:str, is_loud=True) -> WebElement:
    element = None
    locator = (By.CLASS_NAME, class_element)
    try:
        element = WebDriverWait(driver, driver_delay).until(EC.presence_of_element_located(locator))
    except TimeoutException:
        if is_loud:
            print(f"[find_element_by_class] Failed to get {class_element}")
        sys.exit(1)
    return element

def accept_all_cookies(driver:WebDriver):
    global have_cookies
    class_accept = "cc-allow"
    try:
        element_accept = get_element_by_class(driver, class_accept, is_loud=False)
        element_accept.click()
    except:
        have_cookies = False
        log("no cookies to accept")
    else:
        have_cookies = True
        log("accepting all cookies")
        time.sleep(basic_delay)

def click_fusion_start(driver:WebDriver):
    try:
        element = get_element_by_id(driver, id_fusion)
        tryClick(element)
    except:
        log("click start failed")
    time.sleep(driver_delay)

def tryClick(element:WebElement, t=10):
    endTime = time.time() + t
    while True:
        try:
            element.click()
        except:
            time.sleep(1)
            if time.time() > endTime:
                break
            continue
        break

def trySendkeys(element:WebElement, keys, t=10):
    endTime = time.time() + t
    while True:
        try:
            element.send_keys(keys)
        except:
            time.sleep(1)
            if time.time() > endTime:
                break
            continue
        break

def clear_element(element:WebElement):
    trySendkeys(element, Keys.CONTROL + "a")
    trySendkeys(element, Keys.DELETE)

def create_driver():
    driver = get_driver()
    print(" ")
    driver.get(fusion_url)
    return driver

def init_website(driver:WebDriver):
    log("waiting for the website to load")
    time.sleep(driver_delay)
    accept_all_cookies(driver)
    # 230819 japeal changed their website
    # 201002 code modified here
    log("clicking start")
    time.sleep(driver_delay)
    click_fusion_start(driver)
    print(" ")

def getDownLoadedFileName(driver:WebDriver, waitTime):
    driver.execute_script("window.open()")
    WebDriverWait(driver, 10).until(EC.new_window_is_opened)
    driver.switch_to.window(driver.window_handles[-1])
    driver.get("about:downloads")

    endTime = time.time() + waitTime
    while True:
        try:
            fileName = driver.execute_script("return document.querySelector('#contentAreaDownloadsView .downloadMainArea .downloadContainer description:nth-of-type(1)').value")
            if fileName:
                driver.close()
                driver.switch_to.window(driver.window_handles[-1])
                return fileName
        except:
            pass
        time.sleep(1)
        if time.time() > endTime:
            break

fix_table = {
    '199': "slowking",
    '201': "unown",
    '664': "scatterbug",
    '668': "pyroar",
}

def handle_head(driver:WebDriver, head:str):
    if head in fix_table:
        head = fix_table[head]

    log("clicking on pokemon portrait")
    element = get_element_by_id(driver, id_head_pokemon)
    tryClick(element)
    
    log(f"writing pokemon name ({head})")
    # element = get_element_by_id(driver, id_textbox)
    element = get_element_by_class(driver, class_textbox)
    clear_element(element)
    trySendkeys(element, head)

    log("picking the best choice")
    element = get_element_by_class(driver, class_selected)
    tryClick(element)

def handle_body(driver:WebDriver, body:str):
    if body in fix_table:
        body = fix_table[body]
    log("clicking on pokemon portrait")
    element = get_element_by_id(driver, id_body_pokemon)
    tryClick(element)
    
    log(f"writing pokemon name ({body})")
    # element = get_element_by_id(driver, id_textbox)
    element = get_element_by_class(driver, class_textbox)
    clear_element(element)
    trySendkeys(element, body)

    log("picking the best choice")
    element = get_element_by_class(driver, class_selected)
    tryClick(element)

def download_sprite(driver:WebDriver, head:str, body:str):
    log("pokemon fusion")
    time.sleep(basic_delay)
    element = get_element_by_id(driver, id_fusion)
    tryClick(element, 60)
    log("downloading sprite")
    element = get_element_by_id(driver, id_download)
    time.sleep(driver_delay)
    tryClick(element)
    spritename = getDownLoadedFileName(driver, 60)
    log(f"{spritename}")
    filename = f"{head}.{body}.png"
    try:
        os.rename(os.path.join(download_path, spritename), os.path.join(download_path, filename))
    except:
        pass
    print(f"[[ {filename} ]]")
    print(" ")


if __name__ == '__main__':
    if not os.path.exists(download_path):
        os.makedirs(download_path, exist_ok=True)
    print("START")
    head = sys.argv[1]
    body = sys.argv[2]
    filename = f"{head}.{body}.png"
    cachename = os.path.join(download_path, filename)
    tbFilename = os.path.join(download_path, '..', 'infinitefusion', head, filename)
    btFilename = os.path.join(download_path, '..', 'infinitefusion-battle', head, filename)
    if os.path.exists(cachename): # or os.path.exists(tbFilename) or os.path.exists(btFilename):
        log("sprite already exists")
        print("EXIT")
        exit()
    driver = create_driver()
    init_website(driver)
    try:
        handle_head(driver, head.rjust(3, '0'))
        handle_body(driver, body.rjust(3, '0'))
        download_sprite(driver, head, body)
    finally:
        driver.quit()
    log('processing sprite')
    tbDirectory = os.path.join(download_path, '..', 'infinitefusion', head)
    btDirectory = os.path.join(download_path, '..', 'infinitefusion-battle', head)
    if not os.path.exists(tbDirectory):
        os.makedirs(tbDirectory, exist_ok=True)
    if not os.path.exists(btDirectory):
        os.makedirs(btDirectory, exist_ok=True)
    # sudo apt install imagemagick
    commands = [
        f'convert {cachename} -gravity South -chop 0x36 {cachename}',
        f'convert {cachename} -gravity North -background none -extent 300x300 {tbFilename}',
        f'convert {tbFilename} -gravity Center -background none -extent 240x240 {tbFilename}',
        f'convert {tbFilename} -resize 120x120 {tbFilename}',
        f'convert {cachename} -gravity North -background none -extent 300x300 {btFilename}',
        f'convert {btFilename} -gravity Center -background none -extent 192x192 {btFilename}',
        f'convert {btFilename} -resize 96x96 {btFilename}',
    ]
    for command in commands:
        log(command)
        subprocess.run(command, shell=True)
    print("END")
