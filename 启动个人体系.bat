@echo off
chcp 65001 >nul
title 个人体系
cd /d "%~dp0app"
call npm.cmd run build
call npm.cmd start
