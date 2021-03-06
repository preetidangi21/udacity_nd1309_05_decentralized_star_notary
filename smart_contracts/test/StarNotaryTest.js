const StarNotary = artifacts.require('StarNotary')


function errorIsRevert(error) {
    return error.message.startsWith("VM Exception while processing transaction: revert")
}


contract('StarNotary', accounts => {
    const s = {
        name: 'awesome star!',
        dec: '121.874',
        mag: '245.978',
        cent: '32.155',
        story: 'wonderful discovery!',
    }
    const tokenId = 1

    beforeEach(async function() {
        this.contract = await StarNotary.new({from: accounts[0]})
    })

    describe('star creation', () => {

        it('can create a star with all args', async function () {
            await this.contract.createStar(s.name, s.dec, s.mag, s.cent, s.story, tokenId, {from: accounts[0]})
            const sStar = await this.contract.tokenIdToStarInfo(tokenId)
            assert.equal(sStar[0], s.name)
            assert.equal(sStar[1], s.dec)
            assert.equal(sStar[2], s.mag)
            assert.equal(sStar[3], s.cent)
            assert.equal(sStar[4], s.story)
        })
        describe('checkIfStarExist', () => {
            it('returns true for a star that exists', async function () {
                await this.contract.createStar(s.name, s.dec, s.mag, s.cent, s.story, 1, {from: accounts[0]})
                assert(this.contract.checkIfStarExist(s.dec, s.mag, s.cent))
            })
            it('returns false for a star that does not exist', async function () {
                assert(this.contract.checkIfStarExist('should', 'not', 'exist'))
            })
        })
        it('can create a star with only required args', async function () {
            await this.contract.createStar('', s.dec, s.mag, s.cent, '', tokenId, {from: accounts[0]})
            const sStar = await this.contract.tokenIdToStarInfo(tokenId)
            assert.equal(sStar[1], s.dec)
            assert.equal(sStar[2], s.mag)
            assert.equal(sStar[3], s.cent)
            assert.strictEqual(sStar[0], '')
            assert.strictEqual(sStar[4], '')
        })
        it('can\'t create a star with missing required args', async function () {
            try {
                await this.contract.createStar('', '', s.mag, s.cent, '', tokenId, {from: accounts[0]})
            } catch(error) {
                assert(errorIsRevert(error))
            }
            const sStar = await this.contract.tokenIdToStarInfo(tokenId)
            sStar.forEach(starProp => {
                assert.strictEqual(starProp, '')
            })
        })
        it('can\'t create a star that\'s already taken', async function () {
            const dupeId = 2
            await this.contract.createStar(s.name, s.dec, s.mag, s.cent, s.story, tokenId, {from: accounts[0]})
            try {
                await this.contract.createStar('cheat', s.dec, s.mag, s.cent, 'dupe', dupeId, {from: accounts[0]})
            } catch(error) {
                assert(errorIsRevert(error))
            }
            const sStar = await this.contract.tokenIdToStarInfo(dupeId)
            sStar.forEach(starProp => {
                assert.strictEqual(starProp, '')
            })
        })
        it('can\'t create 2nd star on same tokenId', async function () {
            await this.contract.createStar(s.name, s.dec, s.mag, s.cent, s.story, tokenId, {from: accounts[0]})
            try {
                await this.contract.createStar('new', s.dec, s.mag, s.cent, 'dupe', tokenId, {from: accounts[0]})
            } catch(error) {
                assert(errorIsRevert(error))
            }
            const sStar = await this.contract.tokenIdToStarInfo(tokenId)
            assert.equal(sStar[0], s.name)
            assert.equal(sStar[4], s.story)
        })
    })

    describe('buying and selling stars', () => {
        let user1 = accounts[1]
        let user2 = accounts[2]
        let randomMaliciousUser = accounts[3]

        let starId = 1
        let starPrice = web3.toWei(.01, "ether")

        beforeEach(async function () {
            await this.contract.createStar(s.name, s.dec, s.mag, s.cent, s.story, starId, {from: user1})
        })

        it('user1 can put up their star for sale', async function () {
            assert.equal(await this.contract.ownerOf(starId), user1)
            await this.contract.putStarUpForSale(starId, starPrice, {from: user1})

            assert.equal(await this.contract.starsForSale(starId), starPrice)
        })

        describe('user2 can buy a star that was put up for sale', () => {
            beforeEach(async function () {
                await this.contract.putStarUpForSale(starId, starPrice, {from: user1})
            })

            it('user2 is the owner of the star after they buy it', async function() {
                await this.contract.buyStar(starId, {from: user2, value: starPrice, gasPrice: 0})
                assert.equal(await this.contract.ownerOf(starId), user2)
            })

            it('user2 ether balance changed correctly', async function () {
                let overpaidAmount = web3.toWei(.05, 'ether')
                const balanceBeforeTransaction = web3.eth.getBalance(user2)
                await this.contract.buyStar(starId, {from: user2, value: overpaidAmount, gasPrice: 0})
                const balanceAfterTransaction = web3.eth.getBalance(user2)

                assert.equal(balanceBeforeTransaction.sub(balanceAfterTransaction), starPrice)
            })
        })
    })

    describe('minting', () => {
        it('can mint token', async function () {
            await this.contract.mint(1, {from: accounts[0]})
            assert.equal(await this.contract.ownerOf(1), accounts[0])
        })

        describe('duplicate', () => {
            const mintId = 10
            const mintFrom = accounts[1]
            const mintDupeFrom = accounts[2]
            beforeEach(async function () {
                await this.contract.mint(mintId, {from: mintFrom})
            })
            it('cant mint already minted tokenId', async function () {
                try {
                    await this.contract.mint(mintId, {from: mintDupeFrom})
                } catch(error) {
                    assert(errorIsRevert(error))
                }
                assert.equal(await this.contract.ownerOf(mintId), mintFrom)
            })
        })
    })

    describe('ownerOf', () => {
        it('createStar assigns correct owner', async function () {
            const owner = accounts[0]
            await this.contract.createStar(s.name, s.dec, s.mag, s.cent, s.story, tokenId, {from: owner})
            assert.equal(await this.contract.ownerOf(1), owner)
        })
    })
})