# encoding: UTF-8

require 'sinatra'
require 'fileutils'
require 'erb'
require 'base64'

use Rack::Deflater

credentials = eval File.read('credentials.hash')

use Rack::Auth::Basic, "Restricted Area" do |username, password|
  (username == credentials[:username] && password == credentials[:password])
end


set :root, ($ROOT = File.dirname(__FILE__))
set :views, $ROOT
set :port, 3001

set :bind, '0.0.0.0'

# set :environment, :production
set :environment, :development

set :public_folder, $ROOT

before '*' do
  response.headers['Cache-Control'] = 'no-cache'
end


get '/?' do
  send_file 'index.html'
end

post '/mtime' do
  (File.mtime("#{$ROOT}/storage/data").to_f*1000).round.to_s
end

post '/overwrite' do
  unless params[:file] && params[:file][:tempfile]
    halt 400, 'No file detected.'
  end
  tempfile = params[:file][:tempfile]
  FileUtils.cp(tempfile.path, "#{$ROOT}/storage/data")
end
