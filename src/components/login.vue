<template>
  <div>
    <P>3D测试平台</P>
    <input type="text" placeholder="用户名" v-model="loginform.name" required /><br><br>
    <input type="password" placeholder="密码" v-model="loginform.password" required/><br><br>
    <button type="submit" @click="login">登　录</button>
  </div>
</template>

<script>
export default {
  data(){
    return {
      loginform: {
        name:'',
        password:''
      }
    }
  },
  methods:{
    login () {
      if(this.loginform.name === 'admin' && this.loginform.password === '123456') {
        this.$router.push('/test')
      }
    }
  }
}
</script>
