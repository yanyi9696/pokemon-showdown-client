import subprocess

important_files = [
    'itemicons-sheet.png',
    'pokemonicons-sheet.png',
]
cwd = '/home/mc/pokemon-showdown-client/play.pokemonshowdown.com/sprites'
for file in important_files:
    subprocess.run(['wget', '-e', 'robots=off'] + ['http://play.pokemonshowdown.com/sprites/{0}'.format(file)], cwd=cwd)

important_directories = {
    'ani': '*.gif',
    'ani-back': '*.gif',
    'ani-back-shiny': '*.gif',
    'ani-shiny': '*.gif',
    'dex': '*.png',
    'dex-shiny': '*.png',
    'gen5': '*.png',
    'gen5-back': '*.png',
    'gen5-back-shiny': '*.png',
    'gen5-shiny': '*.png',
}
cmd_args = '--recursive -np -N -nd -nH --reject="index.html" -e robots=off -A'.split()
for direct in important_directories:
    cwd = '/home/mc/pokemon-showdown-client/play.pokemonshowdown.com/sprites/{0}'.format(direct)
    # wget --recursive -np -N -nd -nH --reject="index.html" -e robots=off -A "*.png/gif/whatever" --cut-dirs=2 http://play.pokemonshowdown.com/sprites/xxx/
    subprocess.run(['wget'] + cmd_args + [important_directories[direct], '--cut-dirs=2', 'http://play.pokemonshowdown.com/sprites/{0}/'.format(direct)], cwd=cwd)
