import os
import subprocess

files = os.listdir('./raw')
commands = [
    "convert {0}" + f" -fuzz 5% -fill magenta -draw 'color 0,0 floodfill' -transparent magenta" + " {1}",
    # "convert {0} -fuzz 5% -transparent white {1}",
    "convert {0} -resize 120x120 {1}",
    "convert {0} -resize 96x96 {1}",
]
for file in files:
    print(file)
    filepng = file.replace('.jpg', '.png')
    fn1 = ['./raw/' + file, './cache/' + filepng, './cache/' + filepng]
    fn2 = ['./cache/' + filepng, './dex/' + filepng, './battle/' + filepng]
    for command in commands:
        subprocess.run(command.format(fn1.pop(0), fn2.pop(0)), shell=True, cwd='/home/mc/pokemon-showdown-client/sprites/digimon')
