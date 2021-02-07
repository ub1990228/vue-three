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
      this.$axios({
        method: 'get',
        url: '/api/login',
        params: this.loginform
      }).then(result => {
        if (result.data.status == 1) {
          this.$router.push({path:'/test'})
        }
      }).catch(error => {
        console.log(error)
      })
    }
  }
}
</script>
