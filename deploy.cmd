@if "%SCM_TRACE_LEVEL%" NEQ "4" @echo off

::DOS batch file for deploying Node.js applications to Azure App Service
::It's used by Kudu for deployment
::To use this file, add this to your .deployment file: command = deploy.cmd

:: ----------------------
:: KUDU Deployment Script
:: Version: 1.0.17
:: ----------------------

:: Prerequisites
:: -------------

:: Verify node.js installed
where node 2>nul >nul
IF %ERRORLEVEL% NEQ 0 (
  echo Missing node.js executable, please install node.js, if already installed make sure it can be reached from current environment.
  goto error
)

:: Setup
:: -----

setlocal enabledelayedexpansion

SET ARTIFACTS=%~dp0%..\artifacts

IF NOT DEFINED DEPLOYMENT_SOURCE (
  SET DEPLOYMENT_SOURCE=%~dp0%.
)

IF NOT DEFINED DEPLOYMENT_TARGET (
  SET DEPLOYMENT_TARGET=%ARTIFACTS%\wwwroot
)

IF NOT DEFINED NEXT_MANIFEST_PATH (
  SET NEXT_MANIFEST_PATH=%DEPLOYMENT_TARGET%\next.config.js
)

IF NOT DEFINED KUDU_SYNC_CMD (
  :: Install kudu sync
  echo Installing Kudu Sync
  call npm install kudusync -g --silent
  IF !ERRORLEVEL! NEQ 0 goto error

  :: Locally just running "kuduSync" would also work
  SET KUDU_SYNC_CMD=%appdata%\npm\kuduSync.cmd
)

::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:: Deployment
:: ----------

echo Handling node.js deployment.

:: 1. KuduSync
IF /I "%IN_PLACE_DEPLOYMENT%" NEQ "1" (
  call :ExecuteCmd "%KUDU_SYNC_CMD%" -v 50 -f "%DEPLOYMENT_SOURCE%" -t "%DEPLOYMENT_TARGET%" -n "%NEXT_MANIFEST_PATH%" -p "%PREVIOUS_MANIFEST_PATH%" -i ".git;.hg;.deployment;deploy.cmd"
  IF !ERRORLEVEL! NEQ 0 goto error
)

:: 2. Select node version
call :SelectNodeVersion

:: 3. Install npm packages
IF EXIST "%DEPLOYMENT_TARGET%\package.json" (
  pushd "%DEPLOYMENT_TARGET%"
  call :ExecuteCmd npm install
  IF !ERRORLEVEL! NEQ 0 goto error
  popd
)

:: 4. Build the application
IF EXIST "%DEPLOYMENT_TARGET%\package.json" (
  pushd "%DEPLOYMENT_TARGET%"
  call :ExecuteCmd npm run build
  IF !ERRORLEVEL! NEQ 0 goto error
  
  :: 5. Copy static files for standalone mode
  IF EXIST ".next\standalone" (
    echo Copying static files for standalone mode...
    :: Create directories if they don't exist
    IF NOT EXIST ".next\standalone\.next" mkdir ".next\standalone\.next"
    IF EXIST ".next\static" (
      xcopy /E /I /Y ".next\static" ".next\standalone\.next\static"
      IF !ERRORLEVEL! NEQ 0 echo Warning: Failed to copy .next\static
    )
    IF EXIST "public" (
      xcopy /E /I /Y "public" ".next\standalone\public"
      IF !ERRORLEVEL! NEQ 0 echo Warning: Failed to copy public folder
    )
    :: Copy package.json to standalone folder for proper module resolution
    IF EXIST "package.json" (
      copy /Y "package.json" ".next\standalone\package.json"
    )
  )
  popd
)

::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
goto end

:: Select Node Version
:SelectNodeVersion
IF DEFINED NODE_VERSION (
  echo Using Node version: %NODE_VERSION%
  :: Azure App Service에서 Node 버전 설정
  call npm config set node-version %NODE_VERSION%
)
exit /b 0

:: Execute command routine that will echo out when error
:ExecuteCmd
setlocal
set _CMD_=%*
call %_CMD_%
if "%ERRORLEVEL%" NEQ "0" echo Failed exitCode=%ERRORLEVEL%, command=%_CMD_%
exit /b %ERRORLEVEL%

:error
endlocal
echo An error has occurred during web site deployment.
call :exitSetErrorLevel
call :exitFromFunction 2>nul

:exitSetErrorLevel
exit /b 1

:exitFromFunction
()

:end
endlocal
echo Finished successfully.
