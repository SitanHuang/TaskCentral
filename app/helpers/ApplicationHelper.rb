module ApplicationHelper
  # For every single request, we check database
  # (if password is changed, user should immediately be logged out)
  def authenticated_user(user, pass, min_status = 1)
    User.where(username: user, password: pass).where{status >= min_status}.first
  end

  def halt_unauthorized
    session[:admin] = false
    response['WWW-Authenticate'] = %(Basic realm="Restricted Area")
    throw(:halt, [401, "Unauthorized"])
  end

  def authenticate!(min_status = 1)
    auth ||= Rack::Auth::Basic::Request.new(request.env)
    if auth.provided? && auth.basic? && auth.credentials
      user, pass = auth.credentials
      user_obj = authenticated_user(user, pass, min_status)
      if user_obj
        session[:admin] = user_obj.is_root?

        switch_user = user_obj
        # Check if request has "su" parameter and user is root
        if params["su"] && !params["su"].empty?
          halt_unauthorized unless session[:admin]
          
          switch_user = User[params["su"]]

          halt_unauthorized unless switch_user
        end

        session[:user] = switch_user
        request.env["REMOTE_USER"] = switch_user.username
      else
        halt_unauthorized
      end
    else
      halt_unauthorized
    end
  end
end
