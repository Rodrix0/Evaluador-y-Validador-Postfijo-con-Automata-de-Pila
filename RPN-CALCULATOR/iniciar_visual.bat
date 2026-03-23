@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

if not exist "rpn_calculator.exe" (
    set "MK="
    set "GCC="

    where mingw32-make >nul 2>&1
    if not errorlevel 1 (
        set "MK=mingw32-make"
    )

    if not defined MK (
        for /d %%D in ("%LOCALAPPDATA%\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_*") do (
            if exist "%%D\mingw64\bin\mingw32-make.exe" (
                set "MK=%%D\mingw64\bin\mingw32-make.exe"
                set "GCC=%%D\mingw64\bin\gcc.exe"
            )
        )
    )

    if not defined MK (
        echo No se encontro mingw32-make.
        echo Instala WinLibs/MinGW o abre una terminal nueva y vuelve a intentar.
        exit /b 1
    )

    echo Compilando proyecto...
    if defined GCC (
        "!MK!" CC="!GCC!"
    ) else (
        "!MK!"
    )

    if errorlevel 1 (
        echo Error al compilar.
        exit /b 1
    )
)

echo Abriendo interfaz visual...
rpn_calculator.exe
