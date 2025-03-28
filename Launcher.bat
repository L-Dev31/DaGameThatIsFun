@echo off
REM Vérifier si Python est installé
python --version >nul 2>&1
if errorlevel 1 (
    echo Erreur : Python n'est pas installe ou n'est pas dans le PATH
    echo Veuillez installer Python et reessayer.
    pause
    exit /b 1
)

REM Vérifier et installer les dépendances
echo Verification des dependances...
pip install -r requirements.txt >nul 2>&1
if errorlevel 1 (
    echo Erreur : Impossible d'installer les dependances. Verifiez le fichier requirements.txt
    pause
    exit /b 1
)

REM Lancer l'application
echo Lancement de l'application...
start cmd /k "python Python/app.py"
exit