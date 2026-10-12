-- Execute APÓS criar seu usuário em Authentication > Users.
-- Troque o e-mail abaixo pelo mesmo usado no cadastro. Não coloque sua senha neste SQL.
do $$
declare selected_user uuid;
begin
 select id into selected_user from auth.users where lower(email)=lower('SEU_EMAIL_AQUI');
 if selected_user is null then raise exception 'Usuário não encontrado. Crie o usuário e troque SEU_EMAIL_AQUI.';end if;
 insert into public.authorized_users(user_id,enabled) values(selected_user,true) on conflict(user_id) do update set enabled=true;
end $$;
