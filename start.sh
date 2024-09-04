#!/bin/bash

current_dir=$(pwd)

log_dir="${current_dir}/log"
forever_log="${log_dir}/forever.log"
out_log="${log_dir}/out.log"
err_log="${log_dir}/err.log"

# Utworzenie katalogu log, jeśli nie istnieje
if [ ! -d "$log_dir" ]; then
  mkdir -p "$log_dir"
fi

# Funkcja do tworzenia pliku i nadawania uprawnień 777
create_log_file() {
  local log_file=$1
  if [ ! -f "$log_file" ]; then
    touch "$log_file"
    chmod 777 "$log_file"
  fi
}

# Sprawdzenie, czy pliki log istnieją i utworzenie ich, jeśli nie
create_log_file "$forever_log"
create_log_file "$out_log"
create_log_file "$err_log"

dist_dir="${current_dir}/dist"
if [ -d "$dist_dir" ]; then
  rm -rf "$dist_dir"
fi

# Polecenie concurrently z wstawioną zmienną
npm run build
forever start --minUptime 1000 --spinSleepTime 1000 -a -l ${forever_log} -o ${out_log} -e ${err_log} app.js