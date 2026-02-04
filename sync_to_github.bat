@echo off
echo.
echo [ iABS SYSTEM SYNC ]
echo.
echo Adding changes...
git add .
set /p msg="Enter commit message (or press enter for 'Auto update'): "
if "%msg%"=="" set msg="Auto update: System features and UI enhancements"
echo Committing...
git commit -m "%msg%"
echo Pushing to GitHub...
git push origin main
echo.
echo [ SYNC COMPLETE ]
pause
